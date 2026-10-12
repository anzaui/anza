// tools/tests/dev_rebuild.rs
//
// Dev rebuilds keep dist between runs (B8/B9): outputs of deleted sources are
// removed, config changes invalidate the cache, and unchanged .tags.json
// descriptors are not rewritten.

use std::collections::BTreeSet;
use std::path::{Path, PathBuf};

use anza_cli::extract::compile;

fn write(root: &Path, rel: &str, content: &str) {
  let path = root.join(rel);
  std::fs::create_dir_all(path.parent().unwrap()).unwrap();
  std::fs::write(path, content).unwrap();
}

fn files(dir: &Path) -> BTreeSet<PathBuf> {
  walkdir::WalkDir::new(dir)
    .into_iter()
    .filter_map(|e| e.ok())
    .filter(|e| e.file_type().is_file())
    .map(|e| e.path().strip_prefix(dir).unwrap().to_path_buf())
    .collect()
}

fn project(name: &str) -> PathBuf {
  let root = std::env::temp_dir().join(format!("anza-dev-rebuild-{}-{}", name, std::process::id()));
  let _ = std::fs::remove_dir_all(&root);
  write(&root, "src/index.js", "import './pages/a/index.js';\nimport './pages/b/index.js';\n");
  for p in ["a", "b"] {
    write(
      &root,
      &format!("src/pages/{p}/index.js"),
      &format!("page('/docs/{p}', {{ tag: 'doc-{p}', template: {{ html: './index.html' }} }});\n"),
    );
    write(&root, &format!("src/pages/{p}/index.html"), &format!("<h1>{p}</h1>\n"));
  }
  root
}

#[test]
fn dev_rebuild_keeps_outputs_and_removes_orphans() {
  let root = project("orphans");
  let (src, dist) = (root.join("src"), root.join("dist"));

  compile(&src, &dist, false, &[]).expect("first dev build");
  let first = files(&dist);
  assert!(first.contains(Path::new("docs/b/index.html")), "{first:?}");

  // A second dev build with no changes keeps every output.
  compile(&src, &dist, false, &[]).expect("second dev build");
  assert_eq!(files(&dist), first);

  // Delete page b: its module, fragment, SSG page and types go away.
  std::fs::remove_dir_all(src.join("pages/b")).unwrap();
  write(&root, "src/index.js", "import './pages/a/index.js';\n");
  compile(&src, &dist, false, &[]).expect("dev build after delete");
  let after = files(&dist);
  assert!(after.iter().all(|p| !p.starts_with("pages/b")), "{after:?}");
  assert!(!after.contains(Path::new("docs/b/index.html")), "{after:?}");
  assert!(!dist.join("docs/b").exists());
  assert!(after.contains(Path::new("docs/a/index.html")));
  let _ = std::fs::remove_dir_all(&root);
}

#[test]
fn unchanged_tags_descriptors_are_not_rewritten() {
  let root = project("tags");
  let (src, dist) = (root.join("src"), root.join("dist"));
  compile(&src, &dist, false, &[]).expect("first dev build");
  let tags = src.join("pages/a/index.tags.json");
  let before = std::fs::metadata(&tags).unwrap().modified().unwrap();
  std::thread::sleep(std::time::Duration::from_millis(20));
  compile(&src, &dist, false, &[]).expect("second dev build");
  assert_eq!(std::fs::metadata(&tags).unwrap().modified().unwrap(), before);
  let _ = std::fs::remove_dir_all(&root);
}

#[test]
fn base_change_invalidates_the_dev_cache() {
  let root = project("base");
  let (src, dist) = (root.join("src"), root.join("dist"));
  // The graph copy of the fragment (dist/pages/a/index.html) gets the base.
  write(&root, "src/pages/a/index.html", "<h1>a</h1><a href=\"/docs/b\">b</a>\n");
  write(&root, "ssg.json", "{ \"base\": \"/old\" }");
  compile(&src, &dist, false, &[]).expect("dev build with /old");
  let link = std::fs::read_to_string(dist.join("pages/a/index.html")).unwrap();
  assert!(link.contains("href=\"/old/docs/b\""), "{link}");

  write(&root, "ssg.json", "{ \"base\": \"/new\" }");
  compile(&src, &dist, false, &[]).expect("dev build with /new");
  let link = std::fs::read_to_string(dist.join("pages/a/index.html")).unwrap();
  assert!(link.contains("href=\"/new/docs/b\""), "{link}");
  assert!(!link.contains("/new/old/"), "{link}");
  let _ = std::fs::remove_dir_all(&root);
}
