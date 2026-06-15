// tools/src/server/runner.rs

use std::convert::Infallible;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;

use axum::{
  body::Body,
  extract::State,
  handler::Handler,
  http::{header, Response, StatusCode},
  response::sse::{Event, KeepAlive, Sse},
  routing::get,
  Router,
};
use futures_util::stream::{self, Stream};
use tokio::sync::broadcast;
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;

use crate::types::HmrMessage;

pub struct ServerState {
  pub tx: broadcast::Sender<HmrMessage>,
  pub src_dir: PathBuf,
}

pub async fn run(port: u16, src_dir: &Path, tx: broadcast::Sender<HmrMessage>) {
  let state = Arc::new(ServerState {
    tx,
    src_dir: src_dir.to_path_buf(),
  });

  let serve_dir = ServeDir::new(src_dir)
    .append_index_html_on_directories(false)
    .fallback(handle_html_fallback.with_state(state.clone()));

  let app = Router::new()
    .route("/hmr", get(hmr_handler))
    .nest_service("/dist", serve_dir.clone())
    .fallback_service(serve_dir)
    .layer(CorsLayer::permissive())
    .with_state(state);

  let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port))
    .await
    .unwrap();
  logs::server!("Dev Server launched at http://localhost:{}", port);

  axum::serve(listener, app).await.unwrap();
}

async fn hmr_handler(
  State(state): State<Arc<ServerState>>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
  let rx = state.tx.subscribe();
  logs::server!("SSE browser client subscribed to hot reload stream");

  let stream = stream::unfold(rx, |mut rx| async move {
    match rx.recv().await {
      Ok(msg) => {
        logs::hmr!(
          "Dispatched live reload event: {:?} -> {}",
          msg.kind,
          msg.path
        );
        let event = Event::default().data(serde_json::to_string(&msg).unwrap_or_default());
        Some((Ok(event), rx))
      }
      Err(_) => None,
    }
  });

  Sse::new(stream).keep_alive(KeepAlive::new().interval(Duration::from_secs(30)))
}

#[derive(serde::Deserialize, Debug)]
struct RouteInfo {
  #[allow(dead_code)]
  tag: String,
  path: String,
  file: Option<String>,
  html: Option<String>,
  css: Option<String>,
  #[serde(default)]
  layouts: Vec<String>,
  #[serde(default)]
  templates: Vec<String>,
  #[serde(default)]
  styles: Vec<String>,
}

#[derive(serde::Deserialize, Debug)]
struct RoutesManifest {
  routes: Vec<RouteInfo>,
}

fn match_route(pattern: &str, path: &str) -> Option<std::collections::HashMap<String, String>> {
  // Normalize: strip trailing slashes so /foo/ == /foo
  let path = path.trim_end_matches('/');
  let path = if path.is_empty() { "/" } else { path };

  let p_parts: Vec<&str> = pattern.split('/').filter(|s| !s.is_empty()).collect();
  let r_parts: Vec<&str> = path.split('/').filter(|s| !s.is_empty()).collect();

  if pattern == "*" {
    return Some(std::collections::HashMap::new());
  }

  if p_parts.len() != r_parts.len() {
    return None;
  }

  let mut params = std::collections::HashMap::new();
  for (p, r) in p_parts.iter().zip(r_parts.iter()) {
    if p.starts_with(':') {
      let param_name = p.trim_start_matches(':')
                        .trim_end_matches(|c| c == '?' || c == '+' || c == '*');
      params.insert(param_name.to_string(), r.to_string());
    } else if p != r {
      return None;
    }
  }
  Some(params)
}

fn resolve_asset_path(base_file: &str, relative_path: &str) -> String {
  if relative_path.starts_with('/') {
    return relative_path.to_string();
  }

  let mut parts: Vec<&str> = base_file.split('/').collect();
  if !parts.is_empty() {
    parts.pop(); // Remove file name
  }

  for segment in relative_path.split('/') {
    if segment == "." {
      continue;
    } else if segment == ".." {
      parts.pop();
    } else {
      parts.push(segment);
    }
  }

  format!("/dist/{}", parts.join("/"))
}

/// Automatically serves HTML files, falling back to index.html for SPA routing.
async fn handle_html_fallback(
  State(state): State<Arc<ServerState>>,
  req: axum::http::Request<Body>,
) -> Response<Body> {
  let path = req.uri().path();
  // Strip /dist prefix and normalize trailing slashes for route matching.
  let clean = path.strip_prefix("/dist").unwrap_or(path).trim_end_matches('/');
  let clean = if clean.is_empty() { "/" } else { clean };

  // Check if the path matches a registered route in routes.json
  let routes_path = state.src_dir.join("routes.json");
  let is_route = if let Ok(content) = std::fs::read_to_string(&routes_path) {
    if let Ok(manifest) = serde_json::from_str::<RoutesManifest>(&content) {
      manifest.routes.iter().any(|r| match_route(&r.path, clean).is_some())
    } else {
      false
    }
  } else {
    false
  };

  if !is_route {
    return Response::builder()
      .status(StatusCode::NOT_FOUND)
      .body(Body::from("404 Not Found"))
      .unwrap();
  }

  let html_file = state.src_dir.join("index.html");

  match std::fs::read_to_string(&html_file) {
    Ok(mut html) => {
      logs::server!("Serving HTML fallback: {}", html_file.display());

      // If we served the fallback index.html, perform preloading injection
      let fallback = html_file.file_name().map_or(false, |name| name == "index.html");
      if fallback {
        let routes = state.src_dir.join("routes.json");
        let mut inject = String::new();
        let mut route = None;
        let mut params = std::collections::HashMap::new();

        if let Ok(content) = std::fs::read_to_string(&routes) {
          if let Ok(manifest) = serde_json::from_str::<RoutesManifest>(&content) {
            for r in manifest.routes {
              // Use clean (normalized) path — same variable as the is_route check above.
              if let Some(p) = match_route(&r.path, clean) {
                route = Some(r);
                params = p;
                break;
              }
            }
          }
        }

        if let Some(r) = route {
          inject.push_str("    <link rel=\"modulepreload\" href=\"/dist/app.js\" />\n");
          
          for f in &r.layouts {
            inject.push_str(&format!("    <link rel=\"modulepreload\" href=\"/dist/{}\" />\n", f));
          }
          for h in &r.templates {
            // Same-origin fetch — no crossorigin attribute needed.
            inject.push_str(&format!("    <link rel=\"preload\" href=\"{}\" as=\"fetch\" />\n", h));
          }
          for c in &r.styles {
            inject.push_str(&format!("    <link rel=\"preload\" href=\"{}\" as=\"fetch\" />\n", c));
          }

          if let Some(ref f) = r.file {
            inject.push_str(&format!("    <link rel=\"modulepreload\" href=\"/dist/{}\" />\n", f));
            
            if let Some(ref h) = r.html {
              let resolved = resolve_asset_path(f, h);
              // Same-origin fetch — no crossorigin attribute needed.
              inject.push_str(&format!("    <link rel=\"preload\" href=\"{}\" as=\"fetch\" />\n", resolved));
            }
            if let Some(ref c) = r.css {
              let resolved = resolve_asset_path(f, c);
              inject.push_str(&format!("    <link rel=\"preload\" href=\"{}\" as=\"fetch\" />\n", resolved));
            }
          }

          let mut query = std::collections::HashMap::new();
          if let Some(q) = req.uri().query() {
            for pair in q.split('&') {
              let mut parts = pair.splitn(2, '=');
              if let (Some(k), Some(v)) = (parts.next(), parts.next()) {
                query.insert(k.to_string(), v.to_string());
              } else if let Some(k) = parts.next() {
                query.insert(k.to_string(), "".to_string());
              }
            }
          }

          let mut map = serde_json::Map::new();
          let mut param = serde_json::Map::new();
          for (k, v) in &params {
            param.insert(k.clone(), serde_json::Value::String(v.clone()));
          }
          
          let api = format!("/api{}", path);
          let mock = state.src_dir.parent()
            .unwrap_or(&state.src_dir)
            .join("src")
            .join("mocks")
            .join(format!("{}.json", api.trim_start_matches('/')));

          let data = if mock.exists() {
            if let Ok(content) = std::fs::read_to_string(&mock) {
              serde_json::from_str(&content).unwrap_or_else(|_| serde_json::Value::Object(param))
            } else {
              serde_json::Value::Object(param)
            }
          } else {
            serde_json::Value::Object(param)
          };

          map.insert(api, data);
          map.insert("__route".to_string(), serde_json::json!({
            "url": req.uri().to_string(),
            "params": params,
            "query": query,
          }));

          let payload = serde_json::Value::Object(map);

          if let Ok(json) = serde_json::to_string(&payload) {
            inject.push_str(&format!(
              "    <script type=\"application/json\" id=\"anza-state\">{}</script>\n",
              json
            ));
          }
        }

        if !inject.is_empty() {
          html = html.replace("</head>", &format!("{}\n  </head>", inject));
        }
      }

      Response::builder()
        .header(header::CONTENT_TYPE, "text/html; charset=utf-8")
        .body(Body::from(html))
        .unwrap()
    }
    Err(_) => Response::builder()
      .status(StatusCode::NOT_FOUND)
      .body(Body::from("404 Not Found"))
      .unwrap(),
  }
}
