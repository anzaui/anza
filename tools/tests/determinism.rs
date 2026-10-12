// tools/tests/determinism.rs
//
// Two `anza build` runs of the same sources must produce byte-identical
// output (B10). Each run is a separate process, so per-process hash seeds and
// directory order cannot hide behind a single run.

use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::process::Command;

fn write(root: &Path, rel: &str, content: &str) {
  let path = root.join(rel);
  std::fs::create_dir_all(path.parent().unwrap()).unwrap();
  std::fs::write(path, content).unwrap();
}

fn snapshot(dir: &Path) -> BTreeMap<PathBuf, Vec<u8>> {
  fn walk(base: &Path, dir: &Path, out: &mut BTreeMap<PathBuf, Vec<u8>>) {
    for entry in std::fs::read_dir(dir).unwrap() {
      let path = entry.unwrap().path();
      if path.is_dir() {
        walk(base, &path, out);
      } else {
        out.insert(path.strip_prefix(base).unwrap().to_path_buf(), std::fs::read(&path).unwrap());
      }
    }
  }
  let mut out = BTreeMap::new();
  walk(dir, dir, &mut out);
  out
}

#[test]
fn two_builds_are_byte_identical() {
  let root = std::env::temp_dir().join(format!("anza-determinism-{}", std::process::id()));
  let _ = std::fs::remove_dir_all(&root);

  let mut imports = String::new();
  for i in 0..12 {
    imports.push_str(&format!("import './pages/p{i}/index.js';\n"));
    write(
      &root,
      &format!("src/pages/p{i}/index.js"),
      &format!(
        "page('/docs/p{i}', {{ tag: 'doc-p{i}', meta: {{ title: 'P{i}', zeta: 'z', alpha: 'a', mid: 'm' }}, \
         props: {{ zulu: {{ type: String }}, alpha: {{ type: Number }}, kilo: {{ type: Boolean }}, bravo: {{ type: String }} }}, \
         template: {{ html: './index.html' }} }});\n"
      ),
    );
    write(&root, &format!("src/pages/p{i}/index.html"), &format!("<h1>Page {i}</h1><p>Body {i}.</p>\n"));
  }
  imports.push_str("import './pages/item/index.js';\n");
  write(
    &root,
    "src/pages/item/index.js",
    "page('/docs/:group/:slug', { tag: 'doc-item', params: [{ name: 'group', type: String }, { name: 'slug', type: String }], \
     ssg: { expand: [{ slug: 'b', group: 'x' }, { group: 'y', slug: 'a' }, { slug: 'c', group: 'z' }] }, \
     template: { html: './item.html' } });\n",
  );
  write(&root, "src/pages/item/item.html", "<h1>{{group}} / {{slug}}</h1>\n");
  write(&root, "src/index.js", &imports);

  let build = |dist: &str| {
    let out = Command::new(env!("CARGO_BIN_EXE_anza"))
      .current_dir(&root)
      .args(["build", "--src", "src", "--dist", dist])
      .output()
      .expect("run anza build");
    assert!(
      out.status.success(),
      "{}{}",
      String::from_utf8_lossy(&out.stdout),
      String::from_utf8_lossy(&out.stderr)
    );
    snapshot(&root.join(dist))
  };

  let first = build("dist-a");
  let second = build("dist-b");
  assert!(first.len() > 20, "expected a real build, got {} files", first.len());
  assert_eq!(
    first.keys().collect::<Vec<_>>(),
    second.keys().collect::<Vec<_>>(),
    "file sets differ"
  );
  for (path, bytes) in &first {
    assert!(&second[path] == bytes, "{} differs between builds", path.display());
  }
  let _ = std::fs::remove_dir_all(&root);
}
