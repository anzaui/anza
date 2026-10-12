// tools/tests/page_tags.rs
//
// A production build registers each page module's tags descriptor (not its
// HTML) in the inline registry, keyed as the runtime looks it up: SSG moves
// the fragment to `./template.html`, so the key is `./template.tags.json`.
// The emitted prelude must match the library fixture byte for byte
// (library/tests/core/ui/adopt-built-page.test.js runs it in a browser).

use std::path::Path;
use std::process::Command;

fn write(root: &Path, rel: &str, content: &str) {
  let path = root.join(rel);
  std::fs::create_dir_all(path.parent().unwrap()).unwrap();
  std::fs::write(path, content).unwrap();
}

fn first_line(text: &str) -> &str {
  text.lines().next().unwrap_or("")
}

#[test]
fn built_page_module_registers_its_tags_descriptor() {
  let root = std::env::temp_dir().join(format!("anza-page-tags-{}", std::process::id()));
  let _ = std::fs::remove_dir_all(&root);
  write(&root, "src/index.html", "<!doctype html><html><head><script type=\"module\" src=\"/index.js\"></script></head><body></body></html>\n");
  write(&root, "src/index.js", "import './docs/a/index.js';\nimport './docs/b/index.js';\n");
  write(
    &root,
    "src/docs/a/index.js",
    "page('/docs/a', {\n  tag: 'doc-a',\n  template: { html: './index.html' },\n  style: ['./index.css']\n}, import.meta.url);\n",
  );
  write(&root, "src/docs/a/index.html", "<p ref=\"msg\">server</p><button ref=\"action\">go</button>\n");
  write(&root, "src/docs/a/index.css", ":host { display: block; }\n");
  // A client-only page keeps its template path, so the key keeps it too.
  write(
    &root,
    "src/docs/b/index.js",
    "page('/docs/b', { tag: 'doc-b', ssg: false, template: { html: './b.html' } }, import.meta.url);\n",
  );
  write(&root, "src/docs/b/b.html", "<p ref=\"only\">b</p>\n");

  let out = Command::new(env!("CARGO_BIN_EXE_anza"))
    .current_dir(&root)
    .args(["build", "--src", "src", "--dist", "dist", "--no-bundle"])
    .output()
    .expect("run anza build");
  assert!(
    out.status.success(),
    "{}{}",
    String::from_utf8_lossy(&out.stdout),
    String::from_utf8_lossy(&out.stderr)
  );

  let dist = root.join("dist");
  let a = std::fs::read_to_string(dist.join("docs/a/index.js")).unwrap();
  let prelude = first_line(&a);
  assert!(prelude.contains(r#"["./template.tags.json",{"#), "{a}");
  assert!(prelude.contains(r#""refs":["action","msg"]"#), "{a}");
  assert!(!prelude.contains("index.tags.json"), "{a}");
  // The page HTML is never inlined.
  assert!(!prelude.contains(".html") && !prelude.contains("server"), "{a}");
  assert!(a.contains("html: './template.html'"), "{a}");

  let fixture = Path::new(env!("CARGO_MANIFEST_DIR"))
    .join("../library/tests/core/ui/fixtures/built-page/match/index.js");
  let fixture = std::fs::read_to_string(&fixture).unwrap();
  assert_eq!(prelude, first_line(&fixture), "library fixture is out of date with the build output");

  let b = std::fs::read_to_string(dist.join("docs/b/index.js")).unwrap();
  assert!(first_line(&b).contains(r#"["./b.tags.json",{"#), "{b}");
  assert!(b.contains("html: './b.html'"), "{b}");

  let _ = std::fs::remove_dir_all(&root);
}
