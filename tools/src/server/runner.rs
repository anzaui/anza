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
use futures_util::stream::{self, Stream, StreamExt};
use tokio::net::TcpListener;
use std::sync::RwLock;
use tokio::sync::{broadcast, watch};
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;

use crate::types::HmrMessage;

pub struct ServerState {
  pub tx: broadcast::Sender<HmrMessage>,
  pub src_dir: PathBuf,
  /// Deploy base from ssg.json (e.g. `/anza`) — strip from incoming paths in dev.
  pub deploy_base: String,
  /// Parsed `routes.json` of the served dist, reloaded after every rebuild
  /// (never parsed per request).
  routes: RwLock<Arc<Vec<RouteInfo>>>,
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

impl ServerState {
  pub fn new(src_dir: &Path, tx: broadcast::Sender<HmrMessage>) -> Self {
    ServerState {
      tx,
      src_dir: src_dir.to_path_buf(),
      deploy_base: crate::build::base::load_deploy_base(src_dir),
      routes: RwLock::new(Arc::new(Vec::new())),
    }
  }

  /// Current route manifest (cheap: an `Arc` clone).
  fn routes(&self) -> Arc<Vec<RouteInfo>> {
    self.routes.read().map(|r| r.clone()).unwrap_or_default()
  }

  /// Re-read `routes.json`. A missing or unparsable file keeps the last good
  /// manifest (a failed dev rebuild keeps serving the last good output).
  pub async fn reload_routes(&self) {
    let path = self.src_dir.join("routes.json");
    let Ok(text) = tokio::fs::read_to_string(&path).await else {
      return;
    };
    match serde_json::from_str::<RoutesManifest>(&text) {
      Ok(manifest) => {
        if let Ok(mut routes) = self.routes.write() {
          *routes = Arc::new(manifest.routes);
        }
      }
      Err(err) => anza_logs::warn!("cannot parse {}: {}", path.display(), err),
    }
  }
}

/// The dev server app: SSE `/hmr`, static dist with SPA/SSG fallback, and
/// the dev response layer (HMR client injection).
pub fn router(state: Arc<ServerState>) -> Router {
  let serve_dir = ServeDir::new(&state.src_dir)
    .append_index_html_on_directories(false)
    .fallback(handle_html_fallback.with_state(state.clone()));

  Router::new()
    .route("/hmr", get(hmr_handler))
    .route("/sw.js", get(super::dev::noop_sw))
    .route("/dist/sw.js", get(super::dev::noop_sw))
    .nest_service("/dist", serve_dir.clone())
    .fallback_service(serve_dir)
    .layer(middleware::from_fn(super::dev::layer))
    .layer(CorsLayer::permissive())
    .layer(middleware::from_fn_with_state(state.clone(), strip_deploy_base))
    .with_state(state)
}

/// Serve `router` for `src_dir` on an already bound listener. The route
/// manifest is loaded now and again each time `rebuilt` changes.
pub async fn serve(
  listener: TcpListener,
  src_dir: &Path,
  tx: broadcast::Sender<HmrMessage>,
  rebuilt: Option<watch::Receiver<u64>>,
) {
  let state = Arc::new(ServerState::new(src_dir, tx));
  state.reload_routes().await;
  if let Some(mut rebuilt) = rebuilt {
    let state = state.clone();
    tokio::spawn(async move {
      while rebuilt.changed().await.is_ok() {
        state.reload_routes().await;
      }
    });
  }
  let app = router(state);
  if let Err(err) = axum::serve(listener, app).await {
    anza_logs::error!("Dev server stopped: {}", err);
  }
}

pub async fn run(
  port: u16,
  src_dir: &Path,
  tx: broadcast::Sender<HmrMessage>,
  rebuilt: watch::Receiver<u64>,
) {
  let deploy_base = crate::build::base::load_deploy_base(src_dir);
  if !deploy_base.is_empty() {
    anza_logs::info!(
      "Dev server mirrors deploy base {:?} — requests may use either /… or /{}/…",
      deploy_base,
      deploy_base.trim_start_matches('/')
    );
  }

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
  serve(listener, src_dir, tx, Some(rebuilt)).await;
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

/// Capacity of the HMR broadcast channel (events buffered per SSE client).
pub const HMR_CHANNEL: usize = 256;

/// HMR events for one SSE client. A client that falls behind the broadcast
/// buffer (`Lagged`) gets one `reload` event instead of a closed stream, so
/// no change is ever silently lost. Ends when the sender is dropped.
pub fn hmr_messages(rx: broadcast::Receiver<HmrMessage>) -> impl Stream<Item = HmrMessage> {
  stream::unfold(rx, |mut rx| async move {
    match rx.recv().await {
      Ok(msg) => Some((msg, rx)),
      Err(broadcast::error::RecvError::Lagged(skipped)) => {
        anza_logs::warn!("HMR client missed {} event(s); asking it to reload", skipped);
        let reload = HmrMessage { kind: crate::types::ChangeKind::Reload, path: String::new() };
        Some((reload, rx))
      }
      Err(broadcast::error::RecvError::Closed) => None,
    }
  })
}

async fn hmr_handler(
  State(state): State<Arc<ServerState>>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
  let rx = state.tx.subscribe();
  anza_logs::server!("SSE browser client subscribed to hot reload stream");

  let stream = hmr_messages(rx).map(|msg| {
    anza_logs::hmr!("Dispatched live reload event: {:?} -> {}", msg.kind, msg.path);
    Ok(Event::default().data(serde_json::to_string(&msg).unwrap_or_default()))
  });

  Sse::new(stream).keep_alive(KeepAlive::new().interval(Duration::from_secs(30)))
}

#[derive(serde::Deserialize, Debug, Clone)]
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

async fn is_file(path: &Path) -> bool {
  tokio::fs::metadata(path).await.map_or(false, |m| m.is_file())
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

  let routes = state.routes();
  let is_route = routes.iter().any(|r| match_route(&r.path, clean).is_some());

  if !is_route && clean != "/" {
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

  let index = state.src_dir.join("index.html");
  let (html_file, is_ssg) = if clean != "/" && is_file(&ssg_file).await {
    (ssg_file, true)
  } else if clean == "/" && is_file(&index).await {
    // Root may be SSG home or SPA shell — serve dist/index.html either way.
    (index, true)
  } else {
    (index, false)
  };

  match tokio::fs::read_to_string(&html_file).await {
    Ok(mut html) => {
      anza_logs::server!("Serving HTML {}: {}", if is_ssg { "SSG" } else { "fallback" }, html_file.display());

      // Preload injection only for the SPA shell (SSG pages already embed preloads).
      let fallback = !is_ssg && html_file.file_name().map_or(false, |name| name == "index.html");
      if fallback {
        let mut inject = String::new();
        let mut route = None;
        let mut params = std::collections::HashMap::new();

        for r in routes.iter() {
          // Use clean (normalized) path — same variable as the is_route check above.
          if let Some(p) = match_route(&r.path, clean) {
            route = Some(r);
            params = p;
            break;
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

          let data = match tokio::fs::read_to_string(&mock).await {
            Ok(content) => serde_json::from_str(&content).unwrap_or_else(|_| serde_json::Value::Object(param)),
            Err(_) => serde_json::Value::Object(param),
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

#[cfg(test)]
mod tests {
  use super::*;
  use crate::types::ChangeKind;

  fn msg(path: &str) -> HmrMessage {
    HmrMessage { kind: ChangeKind::Css, path: path.into() }
  }

  #[tokio::test]
  async fn lagged_client_gets_a_reload_instead_of_a_closed_stream() {
    let (tx, _keep) = broadcast::channel::<HmrMessage>(2);
    let rx = tx.subscribe();
    for i in 0..5 {
      tx.send(msg(&format!("{i}.css"))).unwrap();
    }
    drop(tx);
    drop(_keep);
    let got: Vec<HmrMessage> = hmr_messages(rx).collect().await;
    assert_eq!(got.len(), 3, "{got:?}");
    assert_eq!(got[0].kind, ChangeKind::Reload);
    assert_eq!(got[1].path, "3.css");
    assert_eq!(got[2].path, "4.css");
  }
}
