// Page rendering: the unknown-route fallback escapes the request path, and a
// route can never pull a template from outside the template root (E1).

use {
  anza::data::r#in::config::setup::Setup,
  std::{collections::HashMap, fs, path::PathBuf},
};

struct Dir(PathBuf);

impl Drop for Dir {
  fn drop(&mut self) {
    let _ = fs::remove_dir_all(&self.0);
  }
}

fn project(name: &str) -> Dir {
  let dir = std::env::temp_dir().join(format!("anza-page-{}-{}", name, std::process::id()));
  let _ = fs::remove_dir_all(&dir);
  fs::create_dir_all(dir.join("root/pages")).unwrap();
  fs::write(dir.join("root/pages/about.html"), "<h1>About</h1>").unwrap();
  // Outside the template root.
  fs::write(dir.join("secret.html"), "<p>SECRET</p>").unwrap();
  fs::write(dir.join("root/secret.html"), "<p>ROOT-LEVEL</p>").unwrap();
  Dir(dir)
}

#[test]
fn fallback_escapes_the_route() {
  let dir = project("xss");
  let engine = Setup::new(dir.0.join("root")).run().unwrap();
  let params = HashMap::new();

  let doc = engine.render_page("/<script>alert('x')</script>", &params).unwrap();
  let html = doc.html;
  assert!(!html.contains("<script>alert"), "{html}");
  assert!(html.contains("Route: /&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;"), "{html}");

  let doc = engine.render_page("/\"><img src=x onerror=alert(1)>&", &params).unwrap();
  let html = doc.html;
  assert!(html.contains("&quot;&gt;&lt;img src=x onerror=alert(1)&gt;&amp;"), "{html}");

  // Known pages still render.
  assert!(engine.render_page("/about", &params).unwrap().html.contains("<h1>About</h1>"));
}

#[test]
fn routes_cannot_escape_the_template_root() {
  let dir = project("traversal");
  let engine = Setup::new(dir.0.join("root")).run().unwrap();
  let params = HashMap::new();
  for route in [
    "/../secret",
    "/../../secret",
    "/pages/../secret",
    "/../root/secret",
    "/./secret/..",
    "/..\\secret",
  ] {
    let html = engine.render_page(route, &params).unwrap().html;
    assert!(!html.contains("SECRET"), "{route}: {html}");
    assert!(!html.contains("ROOT-LEVEL"), "{route}: {html}");
    assert!(html.contains("Route: "), "{route}: {html}");
  }
}
