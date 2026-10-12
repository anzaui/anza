// Template size cap and symlinks out of the root (G10).

use {
  anza::{Error, Setup},
  std::{fs, path::PathBuf},
};

struct Dir(PathBuf);

impl Drop for Dir {
  fn drop(&mut self) {
    let _ = fs::remove_dir_all(&self.0);
  }
}

fn project(name: &str) -> Dir {
  let dir = std::env::temp_dir().join(format!("anza-limits-{}-{}", name, std::process::id()));
  let _ = fs::remove_dir_all(&dir);
  fs::create_dir_all(dir.join("root")).unwrap();
  Dir(dir)
}

#[test]
fn oversized_templates_fail_setup() {
  let dir = project("size");
  let root = dir.0.join("root");
  fs::write(root.join("big.html"), "x".repeat(1024 * 1024 + 1)).unwrap();
  match Setup::new(&root).run() {
    Err(Error::Template(msg)) => {
      assert!(msg.contains("big.html"), "{msg}");
      assert!(!msg.contains(dir.0.to_str().unwrap()), "{msg}");
    }
    Err(e) => panic!("{e}"),
    Ok(_) => panic!("oversized template accepted"),
  }

  // Exactly at the cap is fine, and the cap is configurable.
  fs::write(root.join("big.html"), "x".repeat(1024 * 1024)).unwrap();
  assert!(Setup::new(&root).run().is_ok());
  let mut setup = Setup::new(&root);
  setup.max_template_bytes = 1024;
  assert!(matches!(setup.run(), Err(Error::Template(_))));
}

#[cfg(unix)]
#[test]
fn symlinks_out_of_the_root_are_not_followed() {
  use std::os::unix::fs::symlink;
  let dir = project("symlink");
  let root = dir.0.join("root");
  fs::create_dir_all(dir.0.join("outside")).unwrap();
  fs::write(dir.0.join("outside/secret.html"), "<p>SECRET</p>").unwrap();
  fs::write(root.join("real.html"), "<p>real</p>").unwrap();
  symlink(dir.0.join("outside/secret.html"), root.join("leak.html")).unwrap();
  symlink(dir.0.join("outside"), root.join("linked")).unwrap();
  symlink(root.join("real.html"), root.join("alias.html")).unwrap();

  let engine = Setup::new(&root).run().unwrap();
  assert!(engine.get("real.html").is_ok());
  assert!(engine.get("alias.html").is_ok(), "in-root symlinks still load");
  assert!(engine.get("leak.html").is_err());
  assert!(engine.get("linked/secret.html").is_err());
  let manifest = engine.manifest().unwrap();
  assert_eq!(manifest.templates.len(), 2, "{:?}", manifest.templates.keys());
}
