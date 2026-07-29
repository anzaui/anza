// tools/src/server/runner.rs

use std::convert::Infallible;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;

use axum::{
  body::Body,
  extract::State,
  handler::Handler,
  http::{header, Request, Response, StatusCode, Uri},
  middleware::{self, Next},
  response::sse::{Event, KeepAlive, Sse},
  routing::get,
  Router,
};
use futures_util::stream::{self, Stream};
use tokio::net::TcpListener;
use tokio::sync::broadcast;
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;

use crate::types::HmrMessage;

pub struct ServerState {
  pub tx: broadcast::Sender<HmrMessage>,
  pub src_dir: PathBuf,
  /// Deploy base from ssg.json (e.g. `/anza`) — strip from incoming paths in dev.
  pub deploy_base: String,
}

/// Mirror GitHub Pages subpath hosting: `/anza/styles/...` → `/styles/...`.
async fn strip_deploy_base(
  State(state): State<Arc<ServerState>>,
  mut req: Request<Body>,
  next: Next,
) -> Response<Body> {
  let deploy_base = &state.deploy_base;
  if deploy_base.is_empty() {
    return next.run(req).await;
  }

  let path = req.uri().path();
  let stripped = crate::build::base::strip_base_prefix(path, deploy_base);
  if stripped != path {
    let path_and_query = if let Some(q) = req.uri().query() {
      format!("{stripped}?{q}")
    } else {
      stripped
    };
    if let Ok(next_uri) = path_and_query.parse::<Uri>() {
      *req.uri_mut() = next_uri;
    }
  }

  next.run(req).await
}

pub async fn run(port: u16, src_dir: &Path, tx: broadcast::Sender<HmrMessage>) {
  let deploy_base = crate::build::base::load_deploy_base(src_dir);
  if !deploy_base.is_empty() {
    anza_logs::info!(
      "Dev server mirrors deploy base {:?} — requests may use either /… or /{}/…",
      deploy_base,
      deploy_base.trim_start_matches('/')
    );
  }

  let state = Arc::new(ServerState {
    tx,
    src_dir: src_dir.to_path_buf(),
    deploy_base: deploy_base.clone(),
  });

  let serve_dir = ServeDir::new(src_dir)
    .append_index_html_on_directories(false)
    .fallback(handle_html_fallback.with_state(state.clone()));

  let app = Router::new()
    .route("/hmr", get(hmr_handler))
    .nest_service("/dist", serve_dir.clone())
    .fallback_service(serve_dir)
    .layer(CorsLayer::permissive())
    .layer(middleware::from_fn_with_state(state.clone(), strip_deploy_base))
    .with_state(state);

  let (listener, bound_port) = match bind_port("0.0.0.0", port).await {
    Ok(pair) => pair,
    Err(err) => {
      anza_logs::error!("{}", err);
      anza_logs::exit_with(
        anza_logs::error::exit::BIND,
        "Could not bind dev server — try a different --port",
      );
    }
  };

  anza_logs::server!("Dev Server launched at http://localhost:{}", bound_port);

  if let Err(err) = axum::serve(listener, app).await {
    anza_logs::error!("Dev server stopped: {}", err);
  }
}

async fn bind_port(host: &str, start_port: u16) -> Result<(TcpListener, u16), String> {
  let mut last_err = None;

  for port in anza_logs::port_attempts(start_port, anza_logs::DEFAULT_MAX_PORT_ATTEMPTS) {
    match TcpListener::bind(format!("{host}:{port}")).await {
      Ok(listener) => {
        if port != start_port {
          anza_logs::warn!(
            "Port {} is in use; dev server listening on {} instead",
            start_port,
            port
          );
        }
        return Ok((listener, port));
      }
      Err(err) if anza_logs::is_addr_in_use(&err) => {
        last_err = Some(err);
        continue;
      }
      Err(err) => return Err(format!("Failed to bind {host}:{port}: {err}")),
    }
  }

  Err(format!(
    "No free port in range {}–{} ({})",
    start_port,
    start_port
      .saturating_add(anza_logs::DEFAULT_MAX_PORT_ATTEMPTS.saturating_sub(1)),
    last_err
      .map(|e| e.to_string())
      .unwrap_or_else(|| "address already in use".to_string())
  ))
}

async fn hmr_handler(
  State(state): State<Arc<ServerState>>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
  let rx = state.tx.subscribe();
  anza_logs::server!("SSE browser client subscribed to hot reload stream");

  let stream = stream::unfold(rx, |mut rx| async move {
    match rx.recv().await {
      Ok(msg) => {
        anza_logs::hmr!(
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

  format!("/{}", parts.join("/"))
}

/// Returns the correct `as` attribute for a `<link rel="preload">` tag
/// based on the file extension.
fn preload_as(path: &str) -> &'static str {
  if path.ends_with(".css") {
    "style"
  } else if path.ends_with(".html") {
    "fetch"
  } else {
    "fetch"
  }
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

  // Prefer Mode A SSG: dist/<route>/index.html (or dist/index.html for `/`).
  // Without this, every deep link falls through to the SPA shell and CSR
  // remounts docks — also the page's ./index.html template was historically
  // overwritten by SSG, nesting full docs chrome inside the leaf shadow.
  let ssg_file = if clean == "/" {
    state.src_dir.join("index.html")
  } else {
    state
      .src_dir
      .join(clean.trim_start_matches('/'))
      .join("index.html")
  };

  let (html_file, is_ssg) = if ssg_file.exists() && clean != "/" {
    (ssg_file, true)
  } else if clean == "/" && state.src_dir.join("index.html").exists() {
    // Root may be SSG home or SPA shell — serve dist/index.html either way.
    (state.src_dir.join("index.html"), true)
  } else {
    (state.src_dir.join("index.html"), false)
  };

  match std::fs::read_to_string(&html_file) {
    Ok(mut html) => {
      anza_logs::server!("Serving HTML {}: {}", if is_ssg { "SSG" } else { "fallback" }, html_file.display());

      // Preload injection only for the SPA shell (SSG pages already embed preloads).
      let fallback = !is_ssg && html_file.file_name().map_or(false, |name| name == "index.html");
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
          inject.push_str("    <link rel=\"modulepreload\" href=\"/app.js\" />\n");
          
          for f in &r.layouts {
            inject.push_str(&format!("    <link rel=\"modulepreload\" href=\"/{}\" />\n", f));
          }
          for h in &r.templates {
            let as_attr = preload_as(h);
            inject.push_str(&format!("    <link rel=\"preload\" href=\"{}\" as=\"{}\" crossorigin />\n", h, as_attr));
          }
          for c in &r.styles {
            let as_attr = preload_as(c);
            inject.push_str(&format!("    <link rel=\"preload\" href=\"{}\" as=\"{}\" crossorigin />\n", c, as_attr));
          }

          if let Some(ref f) = r.file {
            inject.push_str(&format!("    <link rel=\"modulepreload\" href=\"/{}\" />\n", f));
            
            if let Some(ref h) = r.html {
              let resolved = resolve_asset_path(f, h);
              let as_attr = preload_as(&resolved);
              inject.push_str(&format!("    <link rel=\"preload\" href=\"{}\" as=\"{}\" crossorigin />\n", resolved, as_attr));
            }
            if let Some(ref c) = r.css {
              let resolved = resolve_asset_path(f, c);
              if !r.styles.contains(&resolved) {
                let as_attr = preload_as(&resolved);
                inject.push_str(&format!("    <link rel=\"preload\" href=\"{}\" as=\"{}\" crossorigin />\n", resolved, as_attr));
              }
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
