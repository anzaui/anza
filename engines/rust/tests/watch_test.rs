// `watch` feature: template edits, additions and removals reach the cache (E2).
#![cfg(feature = "watch")]

use {
  anza::data::r#in::config::setup::Setup,
  std::{
    fs,
    time::{Duration, Instant},
  },
};

fn wait_for(mut ok: impl FnMut() -> bool) -> bool {
  let start = Instant::now();
  while start.elapsed() < Duration::from_secs(10) {
    if ok() {
      return true;
    }
    std::thread::sleep(Duration::from_millis(20));
  }
  false
}

#[test]
fn templates_reload_on_change() {
  let root = std::env::temp_dir().join(format!("anza-watch-{}", std::process::id()));
  let _ = fs::remove_dir_all(&root);
  fs::create_dir_all(root.join("feed")).unwrap();
  fs::write(root.join("feed/card.html"), "<p>{{v}} one</p>").unwrap();

  let mut setup = Setup::new(&root);
  setup.watch = true;
  let engine = setup.run().unwrap();
  let render = |name: &str| engine.get(name).ok().and_then(|t| t.bind(&[("v", "x")]).ok());
  assert_eq!(render("feed/card.html").as_deref(), Some("<p>x one</p>"));

  // Edit.
  fs::write(root.join("feed/card.html"), "<p>{{v}} two</p>").unwrap();
  assert!(wait_for(|| render("feed/card.html").as_deref() == Some("<p>x two</p>")), "edit not reloaded");

  // Add.
  fs::write(root.join("feed/new.html"), "<b>{{v}}</b>").unwrap();
  assert!(wait_for(|| render("feed/new.html").as_deref() == Some("<b>x</b>")), "new template not loaded");

  // Remove.
  fs::remove_file(root.join("feed/card.html")).unwrap();
  assert!(wait_for(|| engine.get("feed/card.html").is_err()), "removed template still cached");

  // The manifest follows the cache.
  let manifest = engine.manifest().unwrap();
  assert!(manifest.get("feed/new.html").is_some());
  assert!(manifest.get("feed/card.html").is_none());

  drop(engine);
  let _ = fs::remove_dir_all(&root);
}
