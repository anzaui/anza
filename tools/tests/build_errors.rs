// tools/tests/build_errors.rs
//
// Fault injection for `anza build`: every failure must end in a non-zero exit
// (B2/B3). Runs the real binary against throwaway projects.

use std::path::{Path, PathBuf};
use std::process::Command;

struct Project {
  root: PathBuf,
}

impl Project {
  fn new(name: &str) -> Self {
    let root = std::env::temp_dir().join(format!("anza-build-errors-{}-{}", name, std::process::id()));
    let _ = std::fs::remove_dir_all(&root);
    std::fs::create_dir_all(root.join("src")).unwrap();
    Project { root }
  }

  fn write(&self, rel: &str, content: &str) {
    let path = self.root.join(rel);
    std::fs::create_dir_all(path.parent().unwrap()).unwrap();
    std::fs::write(path, content).unwrap();
  }

  fn build(&self, dist: &Path) -> std::process::Output {
    Command::new(env!("CARGO_BIN_EXE_anza"))
      .current_dir(&self.root)
      .arg("build")
      .arg("--src")
      .arg(self.root.join("src"))
      .arg("--dist")
      .arg(dist)
      .output()
      .expect("run anza build")
  }
}

impl Drop for Project {
  fn drop(&mut self) {
    let _ = std::fs::remove_dir_all(&self.root);
  }
}

fn stderr_and_stdout(out: &std::process::Output) -> String {
  format!(
    "{}{}",
    String::from_utf8_lossy(&out.stdout),
    String::from_utf8_lossy(&out.stderr)
  )
}

/// A minimal valid project: one SSG page rendered at `/`.
fn minimal(p: &Project) {
  p.write("src/index.js", "import './pages/home/index.js';\n");
  p.write(
    "src/pages/home/index.js",
    "page('/', { tag: 'page-home', template: { html: './index.html' } });\n",
  );
  p.write("src/pages/home/index.html", "<h1>Home</h1><p>Hello.</p>\n");
}

#[test]
fn clean_project_builds_with_exit_zero() {
  let p = Project::new("ok");
  minimal(&p);
  let dist = p.root.join("dist");
  let out = p.build(&dist);
  assert!(out.status.success(), "{}", stderr_and_stdout(&out));
  let home = std::fs::read_to_string(dist.join("index.html")).unwrap();
  assert!(home.starts_with("<!DOCTYPE html>"));
}

#[test]
fn unwritable_output_fails() {
  let p = Project::new("unwritable");
  minimal(&p);
  // dist below a regular file can never be created.
  p.write("blocker", "not a directory");
  let out = p.build(&p.root.join("blocker/dist"));
  assert!(!out.status.success(), "{}", stderr_and_stdout(&out));
}

#[test]
fn js_syntax_error_fails_instead_of_dropping_the_page() {
  let p = Project::new("syntax");
  minimal(&p);
  // Not reachable from the entry, so only extraction sees it.
  p.write("src/pages/broken/index.js", "page('/broken', { tag: 'page-broken', \n");
  let dist = p.root.join("dist");
  let out = p.build(&dist);
  assert!(!out.status.success(), "{}", stderr_and_stdout(&out));
  let log = stderr_and_stdout(&out);
  assert!(log.contains("pages/broken/index.js"), "{log}");
  assert!(!dist.exists(), "failed build must not leave a partial dist");
}

#[test]
fn missing_template_fails_ssg() {
  let p = Project::new("missing-template");
  p.write("src/index.js", "import './pages/home/index.js';\n");
  // Template is referenced by the page but never created.
  p.write(
    "src/pages/home/index.js",
    "page('/docs/x', { tag: 'page-x', template: { html: './nope.html' } });\n",
  );
  let out = p.build(&p.root.join("dist"));
  assert!(!out.status.success(), "{}", stderr_and_stdout(&out));
}
