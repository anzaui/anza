// Page routes only reach `pages/`, malformed routes and names are refused
// without touching the filesystem, and errors never echo paths (G5, G6).

use {
  anza::{data::r#in::config::setup::Setup, Error},
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
  fs::create_dir_all(dir.join("root/feed")).unwrap();
  fs::write(dir.join("root/pages/about.html"), "<h1>About</h1>").unwrap();
  fs::write(dir.join("root/feed/card.html"), "<p>card</p>").unwrap();
  // Outside the template root.
  fs::write(dir.join("secret.html"), "<p>SECRET</p>").unwrap();
  // Inside the root, but not a page.
  fs::write(dir.join("root/secret.html"), "<p>ROOT-LEVEL</p>").unwrap();
  Dir(dir)
}

#[test]
fn unknown_routes_are_not_found_and_not_reflected() {
  let dir = project("xss");
  let engine = Setup::new(dir.0.join("root")).run().unwrap();
  let params = HashMap::new();

  for route in ["/<script>alert('x')</script>", "/missing", "/\"><img src=x>"] {
    match engine.render_page(route, &params) {
      Err(Error::NotFound(msg)) => assert_eq!(msg, "Page not found", "{route}"),
      other => panic!("{route}: {other:?}"),
    }
  }
  assert!(engine.render_page("/about", &params).unwrap().html.contains("<h1>About</h1>"));
}

#[test]
fn routes_only_reach_pages() {
  let dir = project("traversal");
  let engine = Setup::new(dir.0.join("root")).run().unwrap();
  let params = HashMap::new();
  for route in [
    "/secret",
    "/../secret",
    "/../../secret",
    "/pages/../secret",
    "/../root/secret",
    "/./secret/..",
    "/..\\secret",
    "/feed/card",
    "/about\0",
  ] {
    assert!(matches!(engine.render_page(route, &params), Err(Error::NotFound(_))), "{route}");
  }
}

#[test]
fn catch_all_page_never_serves_malformed_routes() {
  let dir = project("catchall");
  fs::write(dir.0.join("root/pages/index.html"), "<p>INDEX</p>").unwrap();
  let engine = Setup::new(dir.0.join("root")).run().unwrap();
  let params = HashMap::new();
  assert!(engine.render_page("/no/such/page", &params).unwrap().html.contains("INDEX"));
  assert!(engine.render_page("/secret", &params).unwrap().html.contains("INDEX"));
  assert!(matches!(engine.render_page("/../secret", &params), Err(Error::NotFound(_))));
}

#[test]
fn malformed_template_names_are_rejected() {
  let dir = project("names");
  let engine = Setup::new(dir.0.join("root")).run().unwrap();
  for name in ["../secret.html", "/feed/card.html", "feed\\card.html", "feed/./card.html", "feed//card.html", "a\0.html", ""] {
    assert!(matches!(engine.get(name), Err(Error::Validation(_))), "{name:?}");
    assert!(engine.render_fragment(name, "main", &HashMap::new()).is_err(), "{name:?}");
  }
  match engine.get("missing.html") {
    Err(e) => assert!(!e.to_string().contains(dir.0.to_str().unwrap()), "{e}"),
    Ok(_) => panic!(),
  }
}

#[test]
fn fragment_allowlist() {
  let dir = project("allow");
  let mut setup = Setup::new(dir.0.join("root"));
  setup.fragments = vec!["feed/".into()];
  let engine = setup.run().unwrap();
  let params = HashMap::new();
  assert!(engine.render_fragment("feed/card.html", "main", &params).is_ok());
  for name in ["secret.html", "pages/about.html"] {
    match engine.render_fragment(name, "main", &params) {
      Err(Error::NotFound(msg)) => assert_eq!(msg, format!("Template '{name}' not found")),
      other => panic!("{name}: {other:?}"),
    }
  }
  // Pages are unaffected by the fragment allowlist.
  assert!(engine.render_page("/about", &params).is_ok());
}
