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
  tokio::spawn(async move { anza_cli::server::runner::serve(listener, &dist, server_tx).await });
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
