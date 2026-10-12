// tools/tests/ssg_params.rs
//
// X3: SSG expansion values are untrusted input. Values that could write
// outside dist are build errors; values are HTML-escaped where interpolated.

use std::path::{Path, PathBuf};

use anza_cli::extract::compile;

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

fn project(name: &str, expand: &str, params_json: Option<&str>) -> Fixture {
  let root = std::env::temp_dir().join(format!("anza-ssg-params-{}-{}", name, std::process::id()));
  let _ = std::fs::remove_dir_all(&root);
  write(
    &root,
    "src/index.html",
    "<!DOCTYPE html>\n<html><head><title>t</title></head><body><script type=\"module\" src=\"/index.js\"></script></body></html>\n",
  );
  write(&root, "src/index.js", "import './pages/p/index.js';\n");
  write(
    &root,
    "src/pages/p/index.js",
    &format!(
      "page('/docs/p/:slug', {{ tag: 'doc-p', params: ['slug'], ssg: {{ expand: [{expand}] }}, template: {{ html: './index.html', css: './index.css' }} }});\n"
    ),
  );
  write(&root, "src/pages/p/index.html", "<h1>Post {{slug}}</h1>\n<p title=\"{{slug}}\">Body of {{slug}}</p>\n");
  write(&root, "src/pages/p/index.css", "h1::after { content: \"{{slug}}\"; }\n");
  if let Some(json) = params_json {
    write(&root, "src/ssg.params.json", json);
  }
  Fixture { root }
}

fn html_files(dir: &Path) -> Vec<PathBuf> {
  walkdir::WalkDir::new(dir)
    .into_iter()
    .filter_map(|e| e.ok())
    .filter(|e| e.path().extension().map_or(false, |x| x == "html"))
    .map(|e| e.path().to_path_buf())
    .collect()
}

#[test]
fn traversal_values_are_build_errors_and_nothing_lands_outside_dist() {
  let cases = [
    ("dotdot", "{ slug: '..' }"),
    ("dot", "{ slug: '.' }"),
    ("backslash", "{ slug: '..\\\\..\\\\..\\\\pwned' }"),
    ("colon", "{ slug: 'C:pwned' }"),
    ("nul", "{ slug: 'a\\u0000b' }"),
    ("fullpath", "'/docs/p/..'"),
  ];
  for (name, expand) in cases {
    let fx = project(name, expand, None);
    let result = compile(&fx.root.join("src"), &fx.root.join("dist"), true, &[]);
    let errors = result.expect_err(&format!("{name}: build must fail"));
    assert!(
      errors.iter().any(|e| e.contains("not allowed")),
      "{name}: {errors:?}"
    );
    // Nothing written above dist (root/docs/index.html would be `/docs/p/..`).
    assert!(!fx.root.join("docs").exists(), "{name}");
    assert!(!fx.root.join("pwned").exists() && !fx.root.join("dist/docs/pwned").exists(), "{name}");
    for file in html_files(&fx.root) {
      assert!(file.starts_with(fx.root.join("dist")) || file.starts_with(fx.root.join("src")), "{}", file.display());
    }
  }
}

#[test]
fn traversal_values_from_ssg_params_json_are_rejected_too() {
  let fx = project("file", "", Some(r#"{ "/docs/p/:slug": [ { "slug": ".." } ] }"#));
  let errors = compile(&fx.root.join("src"), &fx.root.join("dist"), true, &[]).expect_err("must fail");
  assert!(errors.iter().any(|e| e.contains("not allowed")), "{errors:?}");
}

#[test]
fn values_are_escaped_in_html_and_css() {
  let fx = project("xss", r#"{ slug: '<img src=x onerror=alert(1)>"x' }"#, None);
  compile(&fx.root.join("src"), &fx.root.join("dist"), true, &[]).expect("build");
  let page = html_files(&fx.root.join("dist"))
    .into_iter()
    .find(|p| p.to_string_lossy().contains("onerror"))
    .expect("expanded page");
  let html = std::fs::read_to_string(&page).unwrap();
  // Inside <style> a `<` is plain text; only `</style` could end it, and
  // `/` is rejected in values. Everywhere else no raw markup gets through.
  let style_start = html.find("<style>").unwrap();
  let style_end = html[style_start..].find("</style>").unwrap() + style_start;
  let outside = format!("{}{}", &html[..style_start], &html[style_end..]);
  assert!(!outside.contains("<img"), "{html}");
  assert!(!html.contains("content: \"<img") && !html[style_start + 7..style_end].contains("</"), "{html}");
  assert!(html.contains("Post &lt;img src=x onerror=alert(1)&gt;&quot;x"), "{html}");
  assert!(html.contains("title=\"&lt;img src=x onerror=alert(1)&gt;&quot;x\""), "{html}");
  // Title is escaped exactly once.
  assert!(html.contains("<title>"), "{html}");
  assert!(!html.contains("&amp;lt;"), "{html}");
}
