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

#[test]
fn pages_preload_the_full_static_module_closure() {
  let root = project("preload");
  let (src, dist) = (root.join("src"), root.join("dist"));
  write(&root, "src/app.js", "import './index.js';\n");
  write(&root, "src/index.html", "<!DOCTYPE html><script type=\"module\" src=\"/app.js\"></script>\n");
  write(
    &root,
    "src/pages/a/index.js",
    "import './dep.js';\npage('/docs/a', { tag: 'doc-a', template: { html: './index.html' } });\n",
  );
  write(&root, "src/pages/a/dep.js", "import './deep.js';\nexport const lazy = () => import('./lazy.js');\n");
  write(&root, "src/pages/a/deep.js", "export const x = 1;\n");
  write(&root, "src/pages/a/lazy.js", "export const y = 2;\n");
  compile(&src, &dist, false, &[]).expect("dev build");

  let html = std::fs::read_to_string(dist.join("docs/a/index.html")).unwrap();
  let preloads: Vec<&str> = html
    .lines()
    .filter(|l| l.contains("rel=\"modulepreload\""))
    .collect();
  // Breadth-first from the roots (entry, then the page module).
  let order = [
    "/app.js",
    "/pages/a/index.js",
    "/index.js",
    "/pages/a/dep.js",
    "/pages/b/index.js",
    "/pages/a/deep.js",
  ];
  assert_eq!(preloads.len(), order.len(), "{preloads:#?}");
  for (line, url) in preloads.iter().zip(order) {
    assert!(line.contains(&format!("href=\"{url}\"")), "{line} != {url}");
  }
  // Dynamic imports are not needed up front.
  assert!(!html.contains("lazy.js"));

  let headers = std::fs::read_to_string(dist.join("_headers")).unwrap();
  assert!(headers.contains("/*\n  Cache-Control: no-cache\n"), "{headers}");
  assert!(headers.contains("/docs/a\n  Link: </tokens/index.css>; rel=preload; as=style"), "{headers}");
  assert!(headers.contains("</pages/a/deep.js>; rel=modulepreload"), "{headers}");
  let _ = std::fs::remove_dir_all(&root);
}

#[test]
fn shared_dsd_css_is_linked_and_unique_css_stays_inline() {
  let root = project("dsdcss");
  let (src, dist) = (root.join("src"), root.join("dist"));
  for p in ["a", "b"] {
    write(
      &root,
      &format!("src/pages/{p}/index.js"),
      &format!("page('/docs/{p}', {{ tag: 'doc-{p}', template: {{ html: './index.html', css: '/styles/shared.css' }} }});\n"),
    );
  }
  write(&root, "src/styles/shared.css", ".shared { color: red; }\n");
  write(&root, "src/index.js", "import './pages/a/index.js';\nimport './pages/b/index.js';\nimport './pages/c/index.js';\n");
  write(
    &root,
    "src/pages/c/index.js",
    "page('/docs/c', { tag: 'doc-c', template: { html: './index.html', css: './index.css' } });\n",
  );
  write(&root, "src/pages/c/index.html", "<h1>c</h1>\n");
  write(&root, "src/pages/c/index.css", ".only-c { color: blue; }\n");
  compile(&src, &dist, false, &[]).expect("dev build");

  let a = std::fs::read_to_string(dist.join("docs/a/index.html")).unwrap();
  assert!(a.contains("<link rel=\"preload\" href=\"/styles/shared.css\" as=\"style\" />"), "{a}");
  assert!(a.contains("<template shadowrootmode=\"open\">\n<link rel=\"stylesheet\" href=\"/styles/shared.css\" />"), "{a}");
  assert!(!a.contains(".shared"), "{a}");

  let c = std::fs::read_to_string(dist.join("docs/c/index.html")).unwrap();
  assert!(c.contains("<style>\n.only-c { color: blue; }\n</style>"), "{c}");
  assert!(!c.contains("rel=\"preload\" href=\"/pages/c/index.css\""), "{c}");

  let headers = std::fs::read_to_string(dist.join("_headers")).unwrap();
  assert!(headers.contains("</styles/shared.css>; rel=preload; as=style"), "{headers}");
  let _ = std::fs::remove_dir_all(&root);
}

#[test]
fn type_declarations_go_beside_dist_not_into_it() {
  let root = project("types");
  let (src, dist, types) = (root.join("src"), root.join("dist"), root.join("types"));
  write(&root, "types/custom.d.ts", "export {};\n");

  compile(&src, &dist, false, &[]).expect("dev build");
  let shipped = files(&dist);
  assert!(
    shipped.iter().all(|p| !p.to_string_lossy().ends_with(".d.ts")),
    "{shipped:?}"
  );
  assert!(shipped.contains(Path::new("routes.json")));
  for rel in ["index.d.ts", "routes.d.ts", "pages/a/index.d.ts", "pages/b/index.d.ts"] {
    assert!(types.join(rel).is_file(), "missing types/{rel}");
  }

  // Deleting a source prunes its generated declaration, never hand-written ones.
  std::fs::remove_dir_all(src.join("pages/b")).unwrap();
  write(&root, "src/index.js", "import './pages/a/index.js';\n");
  compile(&src, &dist, false, &[]).expect("dev build after delete");
  assert!(!types.join("pages/b/index.d.ts").exists());
  assert!(types.join("pages/a/index.d.ts").is_file());
  assert!(types.join("custom.d.ts").is_file());
  let _ = std::fs::remove_dir_all(&root);
}
