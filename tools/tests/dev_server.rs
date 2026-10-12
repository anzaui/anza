// tools/tests/dev_server.rs
//
// The dev server against a tiny project on a free port: HMR client injected at
// serve time into HTML documents only (R2/R7).

use std::path::{Path, PathBuf};

use anza_cli::extract::compile;
use anza_cli::types::HmrMessage;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::sync::broadcast;

fn write(root: &Path, rel: &str, content: &str) {
  let path = root.join(rel);
  std::fs::create_dir_all(path.parent().unwrap()).unwrap();
  std::fs::write(path, content).unwrap();
}

struct Fixture {
  root: PathBuf,
}

impl Drop for Fixture {
  fn drop(&mut self) {
    let _ = std::fs::remove_dir_all(&self.root);
  }
}

fn fixture(name: &str) -> Fixture {
  let root = std::env::temp_dir().join(format!("anza-dev-server-{}-{}", name, std::process::id()));
  let _ = std::fs::remove_dir_all(&root);
  write(
    &root,
    "src/index.html",
    "<!DOCTYPE html>\n<html><head><title>t</title></head><body><script type=\"module\" src=\"/index.js\"></script></body></html>\n",
  );
  write(&root, "src/index.js", "import './pages/a/index.js';\n");
  write(
    &root,
    "src/pages/a/index.js",
    "page('/docs/a', { tag: 'doc-a', template: { html: './index.html', css: './index.css' } });\n",
  );
  write(&root, "src/pages/a/index.html", "<h1>a</h1>\n");
  write(&root, "src/pages/a/index.css", "h1 { color: red; }\n");
  let fx = Fixture { root };
  compile(&fx.root.join("src"), &fx.root.join("dist"), false, &[]).expect("dev build");
  fx
}

struct Reply {
  status: u16,
  head: String,
  body: String,
}

impl Reply {
  fn header(&self, name: &str) -> Option<String> {
    let prefix = format!("{}:", name.to_ascii_lowercase());
    self
      .head
      .lines()
      .find(|l| l.to_ascii_lowercase().starts_with(&prefix))
      .map(|l| l[prefix.len()..].trim().to_string())
  }
}

async fn get(port: u16, path: &str, headers: &[(&str, &str)]) -> Reply {
  let mut stream = tokio::net::TcpStream::connect(("127.0.0.1", port)).await.unwrap();
  let mut req = format!("GET {path} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n");
  for (k, v) in headers {
    req.push_str(&format!("{k}: {v}\r\n"));
  }
  req.push_str("\r\n");
  stream.write_all(req.as_bytes()).await.unwrap();
  let mut raw = Vec::new();
  stream.read_to_end(&mut raw).await.unwrap();
  let text = String::from_utf8_lossy(&raw).into_owned();
  let (head, body) = text.split_once("\r\n\r\n").unwrap_or((&text, ""));
  let status = head.split(' ').nth(1).and_then(|s| s.parse().ok()).unwrap_or(0);
  Reply { status, head: head.to_string(), body: body.to_string() }
}

async fn start(dist: &Path) -> (u16, broadcast::Sender<HmrMessage>) {
  let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
  let port = listener.local_addr().unwrap().port();
  let (tx, _rx) = broadcast::channel::<HmrMessage>(256);
  let dist = dist.to_path_buf();
  let server_tx = tx.clone();
  tokio::spawn(async move { anza_cli::server::runner::serve(listener, &dist, server_tx, None).await });
  (port, tx)
}

#[tokio::test]
async fn hmr_client_is_injected_at_serve_time_into_documents_only() {
  let fx = fixture("hmr");
  let dist = fx.root.join("dist");

  // Build output never carries the HMR client.
  for entry in walkdir::WalkDir::new(&dist).into_iter().filter_map(|e| e.ok()) {
    if entry.path().extension().map_or(false, |e| e == "html") {
      let html = std::fs::read_to_string(entry.path()).unwrap();
      assert!(!html.contains("EventSource"), "{} has the HMR client", entry.path().display());
    }
  }
  // The component template fragment gets no import map either (R7).
  let fragment = std::fs::read_to_string(dist.join("pages/a/index.html")).unwrap();
  assert!(!fragment.contains("importmap"), "{fragment}");

  let (port, _tx) = start(&dist).await;

  let home = get(port, "/", &[]).await;
  assert_eq!(home.status, 200, "{}", home.head);
  assert!(home.body.contains("EventSource"), "{}", home.body);
  assert_eq!(home.body.matches("EventSource").count(), 1);

  let page = get(port, "/docs/a", &[]).await;
  assert_eq!(page.status, 200, "{}", page.head);
  assert!(page.body.contains("EventSource"), "{}", page.body);

  let template = get(port, "/pages/a/index.html", &[]).await;
  assert_eq!(template.status, 200, "{}", template.head);
  assert!(template.body.contains("<h1>a</h1>"), "{}", template.body);
  assert!(!template.body.contains("EventSource"), "{}", template.body);
  let template = get(port, "/dist/pages/a/index.html", &[]).await;
  assert!(!template.body.contains("EventSource"), "{}", template.body);

  let len: usize = home.header("content-length").unwrap().parse().unwrap();
  assert_eq!(len, home.body.len());
}

#[tokio::test]
async fn sw_js_is_a_self_unregistering_no_op_in_dev() {
  let fx = fixture("sw");
  write(&fx.root, "dist/sw.js", "self.addEventListener('fetch', () => {});\n");
  let (port, _tx) = start(&fx.root.join("dist")).await;
  for path in ["/sw.js", "/dist/sw.js"] {
    let sw = get(port, path, &[]).await;
    assert_eq!(sw.status, 200, "{}", sw.head);
    assert_eq!(sw.header("cache-control").as_deref(), Some("no-store"), "{}", sw.head);
    assert!(sw.header("content-type").unwrap().starts_with("text/javascript"));
    for needle in ["skipWaiting", "caches.delete", "registration.unregister()", "clients.claim()"] {
      assert!(sw.body.contains(needle), "{needle} missing: {}", sw.body);
    }
    assert!(!sw.body.contains("'fetch'"), "{}", sw.body);
  }
}

#[tokio::test]
async fn dev_responses_revalidate_with_strong_etags() {
  let fx = fixture("etag");
  let dist = fx.root.join("dist");
  let (port, _tx) = start(&dist).await;

  for path in ["/", "/docs/a", "/pages/a/index.css", "/index.js", "/dist/pages/a/index.html"] {
    let first = get(port, path, &[]).await;
    assert_eq!(first.status, 200, "{path}: {}", first.head);
    assert_eq!(first.header("cache-control").as_deref(), Some("no-cache"), "{path}: {}", first.head);
    assert!(first.header("last-modified").is_none(), "{path}: {}", first.head);
    let tag = first.header("etag").expect("etag");
    assert!(tag.starts_with('"') && !tag.starts_with("W/"), "{tag}");

    let again = get(port, path, &[("If-None-Match", &tag)]).await;
    assert_eq!(again.status, 304, "{path}: {}", again.head);
    assert_eq!(again.header("etag").as_deref(), Some(tag.as_str()));
    assert!(again.body.is_empty());

    let stale = get(port, path, &[("If-None-Match", "\"nope\"")]).await;
    assert_eq!(stale.status, 200, "{path}: {}", stale.head);
  }

  // An edit changes the tag even within the same second.
  let first = get(port, "/pages/a/index.css", &[]).await;
  let tag = first.header("etag").unwrap();
  write(&fx.root, "dist/pages/a/index.css", "h1 { color: blue; }\n");
  let after = get(port, "/pages/a/index.css", &[("If-None-Match", &tag)]).await;
  assert_eq!(after.status, 200, "{}", after.head);
  assert!(after.body.contains("blue"));
  assert_ne!(after.header("etag").unwrap(), tag);

  // 404s are not cached either.
  let missing = get(port, "/nope.js", &[]).await;
  assert_eq!(missing.status, 404);
  assert_eq!(missing.header("cache-control").as_deref(), Some("no-cache"));
}

#[tokio::test]
async fn route_manifest_is_held_in_memory_and_reloaded_after_rebuilds() {
  let fx = fixture("routes");
  let (src, dist) = (fx.root.join("src"), fx.root.join("dist"));
  let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
  let port = listener.local_addr().unwrap().port();
  let (tx, _rx) = broadcast::channel::<HmrMessage>(256);
  let (rebuilt, rebuilt_rx) = tokio::sync::watch::channel(0u64);
  let served = dist.clone();
  tokio::spawn(async move { anza_cli::server::runner::serve(listener, &served, tx, Some(rebuilt_rx)).await });

  assert_eq!(get(port, "/docs/a", &[]).await.status, 200);
  assert_eq!(get(port, "/docs/b", &[]).await.status, 404);

  // A corrupt manifest on disk is not re-read per request.
  let manifest = std::fs::read_to_string(dist.join("routes.json")).unwrap();
  std::fs::write(dist.join("routes.json"), "{ nope").unwrap();
  assert_eq!(get(port, "/docs/a", &[]).await.status, 200);
  std::fs::write(dist.join("routes.json"), manifest).unwrap();

  // Add a route, rebuild, signal: the new route is served.
  write(&fx.root, "src/index.js", "import './pages/a/index.js';\nimport './pages/b/index.js';\n");
  write(&fx.root, "src/pages/b/index.js", "page('/docs/b', { tag: 'doc-b', template: { html: './index.html' } });\n");
  write(&fx.root, "src/pages/b/index.html", "<h1>b</h1>\n");
  compile(&src, &dist, false, &[]).expect("rebuild");
  rebuilt.send_modify(|n| *n += 1);
  let mut status = 0;
  for _ in 0..50 {
    status = get(port, "/docs/b", &[]).await.status;
    if status == 200 {
      break;
    }
    tokio::time::sleep(std::time::Duration::from_millis(10)).await;
  }
  assert_eq!(status, 200);
}

async fn raw(port: u16, request: &str) -> Reply {
  let mut stream = tokio::net::TcpStream::connect(("127.0.0.1", port)).await.unwrap();
  stream.write_all(request.as_bytes()).await.unwrap();
  let mut raw = Vec::new();
  stream.read_to_end(&mut raw).await.unwrap();
  let text = String::from_utf8_lossy(&raw).into_owned();
  let (head, body) = text.split_once("\r\n\r\n").unwrap_or((&text, ""));
  let status = head.split(' ').nth(1).and_then(|s| s.parse().ok()).unwrap_or(0);
  Reply { status, head: head.to_string(), body: body.to_string() }
}

/// X2: a page on `evil.example` that DNS-rebinds its name to 127.0.0.1 sends
/// `Host: evil.example`. The server must refuse it (dist, mocks, `/hmr`).
#[tokio::test]
async fn dns_rebinding_hosts_are_refused() {
  let fx = fixture("rebind");
  let (port, _tx) = start(&fx.root.join("dist")).await;

  let attacker = format!("attacker.test:{port}");
  for host in ["evil.example", "evil.example:80", attacker.as_str(), "localhost.evil.example", "127.0.0.1.nip.io", "192.168.1.5"] {
    for path in ["/", "/docs/a", "/pages/a/index.css", "/routes.json", "/hmr"] {
      let reply = raw(port, &format!("GET {path} HTTP/1.1\r\nHost: {host}\r\nConnection: close\r\n\r\n")).await;
      assert_eq!(reply.status, 403, "{host}{path}: {}", reply.head);
      assert!(!reply.body.contains("<h1>a</h1>") && !reply.body.contains("color"), "{}", reply.body);
    }
  }
  // No Host header at all (HTTP/1.0 style) is refused too.
  let reply = raw(port, "GET / HTTP/1.0\r\n\r\n").await;
  assert_eq!(reply.status, 403, "{}", reply.head);

  let ok = [
    "localhost".to_string(),
    format!("localhost:{port}"),
    format!("127.0.0.1:{port}"),
    format!("[::1]:{port}"),
    "LOCALHOST".to_string(),
  ];
  for host in &ok {
    let reply = raw(port, &format!("GET /docs/a HTTP/1.1\r\nHost: {host}\r\nConnection: close\r\n\r\n")).await;
    assert_eq!(reply.status, 200, "{host}: {}", reply.head);
  }
}

/// X2: no CORS headers, so another origin's script can't read responses.
#[tokio::test]
async fn cross_origin_reads_are_not_allowed() {
  let fx = fixture("cors");
  let (port, _tx) = start(&fx.root.join("dist")).await;
  let reply = get(port, "/pages/a/index.css", &[("Origin", "https://evil.example")]).await;
  assert_eq!(reply.status, 200);
  assert!(reply.header("access-control-allow-origin").is_none(), "{}", reply.head);
  let preflight = raw(
    port,
    "OPTIONS /routes.json HTTP/1.1\r\nHost: localhost\r\nOrigin: https://evil.example\r\nAccess-Control-Request-Method: GET\r\nConnection: close\r\n\r\n",
  )
  .await;
  assert!(preflight.header("access-control-allow-origin").is_none(), "{}", preflight.head);
}

/// X8: dot segments never match a `:param` route (no `..` param reaching the
/// mock lookup), and `anza-state` JSON can't close its `<script>`.
#[tokio::test]
async fn param_fallback_rejects_dot_segments_and_escapes_state() {
  let fx = fixture("state");
  write(&fx.root, "src/index.js", "import './pages/a/index.js';\nimport './pages/u/index.js';\n");
  write(
    &fx.root,
    "src/pages/u/index.js",
    "page('/u/:id', { tag: 'user-page', params: ['id'], template: { html: './index.html' } });\n",
  );
  write(&fx.root, "src/pages/u/index.html", "<h1>user</h1>\n");
  write(&fx.root, "src/mocks/api/u/1.json", r#"{ "bio": "</script><script>alert(1)</script><!--", "ls": "\u2028" }"#);
  compile(&fx.root.join("src"), &fx.root.join("dist"), false, &[]).expect("dev build");
  let (port, _tx) = start(&fx.root.join("dist")).await;

  let page = get(port, "/u/1", &[]).await;
  assert_eq!(page.status, 200, "{}", page.head);
  let state_at = page.body.find("id=\"anza-state\">").expect("anza-state");
  let state = &page.body[state_at + 16..];
  let state = &state[..state.find("</script>").unwrap()];
  assert!(state.contains("\\u003c/script\\u003e\\u003cscript\\u003ealert(1)"), "{state}");
  assert!(!state.contains('<') && !state.contains('\u{2028}'), "{state}");
  let value: serde_json::Value = serde_json::from_str(state).unwrap();
  assert_eq!(value["/api/u/1"]["bio"], "</script><script>alert(1)</script><!--");

  for path in ["/u/..", "/u/.", "/u/%2e%2e", "/u/%2E%2e"] {
    let reply = get(port, path, &[]).await;
    assert_eq!(reply.status, 404, "{path}: {}", reply.head);
  }
}
