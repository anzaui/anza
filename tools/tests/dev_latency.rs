// tools/tests/dev_latency.rs
//
// Save → HMR-event latency of `anza dev` on the docs site (P6). Ignored by
// default (it does a full build of web/); run with
//
//   cargo test --release --test dev_latency -- --ignored --nocapture
//
// Env: ANZA_BIN (binary to measure, default this crate's `anza`),
//      ANZA_LATENCY_WEB (project, default ../web), ANZA_LATENCY_RUNS (default 7).
// The project is copied to a temp dir (without node_modules/dist) so the
// working tree is never touched; @anzaui/anza points at ../library.

use std::io::{BufRead, BufReader, Read, Write};
use std::net::TcpStream;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

struct Server {
  child: Child,
  root: PathBuf,
}

impl Drop for Server {
  fn drop(&mut self) {
    let _ = self.child.kill();
    let _ = self.child.wait();
    let _ = std::fs::remove_dir_all(&self.root);
  }
}

fn copy_tree(from: &Path, to: &Path) {
  for entry in walkdir::WalkDir::new(from)
    .into_iter()
    .filter_entry(|e| !matches!(e.file_name().to_str(), Some("node_modules" | "dist")))
    .filter_map(|e| e.ok())
  {
    let rel = entry.path().strip_prefix(from).unwrap();
    let target = to.join(rel);
    if entry.file_type().is_dir() {
      std::fs::create_dir_all(&target).unwrap();
    } else if entry.file_type().is_file() {
      std::fs::copy(entry.path(), &target).unwrap();
    }
  }
}

fn free_port() -> u16 {
  std::net::TcpListener::bind("127.0.0.1:0").unwrap().local_addr().unwrap().port()
}

fn wait_ready(port: u16, timeout: Duration) {
  let start = Instant::now();
  while start.elapsed() < timeout {
    if let Ok(mut s) = TcpStream::connect(("127.0.0.1", port)) {
      let _ = s.write_all(b"GET / HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n");
      let mut buf = String::new();
      let _ = s.read_to_string(&mut buf);
      if buf.starts_with("HTTP/1.1 200") {
        return;
      }
    }
    std::thread::sleep(Duration::from_millis(100));
  }
  panic!("dev server did not come up within {timeout:?}");
}

/// Open the SSE stream and return a reader positioned after the headers.
fn subscribe(port: u16) -> BufReader<TcpStream> {
  let mut s = TcpStream::connect(("127.0.0.1", port)).unwrap();
  s.write_all(b"GET /hmr HTTP/1.1\r\nHost: x\r\nAccept: text/event-stream\r\n\r\n").unwrap();
  let mut reader = BufReader::new(s);
  let mut line = String::new();
  loop {
    line.clear();
    reader.read_line(&mut line).unwrap();
    if line == "\r\n" {
      break;
    }
  }
  reader
}

/// Read SSE lines until a `data:` line mentioning `needle`.
fn wait_event(reader: &mut BufReader<TcpStream>, needle: &str) -> String {
  reader.get_ref().set_read_timeout(Some(Duration::from_secs(120))).unwrap();
  let mut line = String::new();
  loop {
    line.clear();
    if reader.read_line(&mut line).unwrap() == 0 {
      panic!("SSE stream closed");
    }
    if line.contains("data:") && line.contains(needle) {
      return line;
    }
  }
}

fn median(mut v: Vec<Duration>) -> Duration {
  v.sort();
  v[v.len() / 2]
}

fn measure(reader: &mut BufReader<TcpStream>, file: &Path, needle: &str, runs: usize) -> Vec<Duration> {
  let original = std::fs::read_to_string(file).unwrap();
  let mut times = Vec::new();
  for i in 0..runs {
    std::thread::sleep(Duration::from_millis(400));
    let start = Instant::now();
    std::fs::write(file, format!("{original}\n/* latency {i} */\n")).unwrap();
    wait_event(reader, needle);
    times.push(start.elapsed());
  }
  times
}

#[test]
#[ignore]
fn css_and_js_save_to_hmr_event_latency() {
  let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
  let web = std::env::var("ANZA_LATENCY_WEB").map(PathBuf::from).unwrap_or(manifest.join("../web"));
  let web = std::fs::canonicalize(web).unwrap();
  let library = std::fs::canonicalize(manifest.join("../library")).unwrap();
  let bin = std::env::var("ANZA_BIN").unwrap_or_else(|_| env!("CARGO_BIN_EXE_anza").to_string());
  let runs: usize = std::env::var("ANZA_LATENCY_RUNS").ok().and_then(|v| v.parse().ok()).unwrap_or(7);

  let root = std::env::temp_dir().join(format!("anza-dev-latency-{}", std::process::id()));
  let _ = std::fs::remove_dir_all(&root);
  copy_tree(&web, &root);
  std::fs::create_dir_all(root.join("node_modules/@anzaui")).unwrap();
  std::os::unix::fs::symlink(&library, root.join("node_modules/@anzaui/anza")).unwrap();

  let port = free_port();
  let started = Instant::now();
  let child = Command::new(&bin)
    .current_dir(&root)
    .args(["dev", "--port", &port.to_string()])
    .stdout(Stdio::null())
    .stderr(Stdio::null())
    .spawn()
    .expect("spawn anza dev");
  let server = Server { child, root: root.clone() };
  wait_ready(port, Duration::from_secs(300));
  let boot = started.elapsed();
  let mut sse = subscribe(port);

  let css = measure(&mut sse, &root.join("src/pages/entry/index.css"), "pages/entry/index.css", runs);
  let tokens = measure(&mut sse, &root.join("src/styles/base.css"), "styles/base.css", runs);
  let html = measure(&mut sse, &root.join("src/pages/entry/index.html"), "pages/entry/index.html", runs);
  let js = measure(&mut sse, &root.join("src/app.js"), "app.js", runs);

  println!("anza dev latency ({bin}, {runs} runs, median / max):");
  println!("  boot (first build + listen): {boot:?}");
  for (name, v) in [("css page", css), ("css styles/", tokens), ("html template", html), ("js app.js", js)] {
    let max = *v.iter().max().unwrap();
    println!("  {name:<14} save -> event: {:?} / {:?}", median(v), max);
  }
  drop(server);
}
