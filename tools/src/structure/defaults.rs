// tools/src/structure/defaults.rs
//
// Convention defaults merged with optional anza.json.

use std::path::{Path, PathBuf};

use super::manifest::{AnzaManifest, SwEntry, SwField};

/// Slot directory names used by import-order classification and doctor.
#[derive(Debug, Clone)]
pub struct Slots {
  pub docks: String,
  pub views: String,
  pub parts: String,
  pub pages: Vec<String>,
}

impl Default for Slots {
  fn default() -> Self {
    Self {
      docks: "docks".into(),
      views: "views".into(),
      parts: "parts".into(),
      pages: vec!["pages".into(), "docs".into()],
    }
  }
}

impl Slots {
  /// Slots for order classification: declared `pages[]` plus `docs` when not listed
  /// so undeclared-but-common trees still sort as pages during build.
  pub fn for_order(self) -> Self {
    let mut pages = self.pages;
    if !pages.iter().any(|p| p == "docs") {
      // Keep docs as a page-tier path for import order even when not declared
      // in anza.json (web/ and similar). Doctor still warns about undeclared trees.
      pages.push("docs".into());
    }
    Self { pages, ..self }
  }
}

/// Fully resolved structure paths after merging defaults + manifest.
#[derive(Debug, Clone)]
pub struct Resolved {
  pub project: PathBuf,
  pub src: PathBuf,
  pub entry: String,
  pub shell: String,
  pub root_dock: String,
  pub pages: Vec<String>,
  pub docks: String,
  pub views: String,
  pub parts: String,
  pub tokens: String,
  pub styles: String,
  /// Normalized SW entries when `sw` key present; empty when key omitted.
  pub sw: Vec<SwEntry>,
  pub sw_explicit: bool,
  pub manifest_present: bool,
}

impl Resolved {
  pub fn slots(&self) -> Slots {
    Slots {
      docks: self.docks.clone(),
      views: self.views.clone(),
      parts: self.parts.clone(),
      pages: self.pages.clone(),
    }
  }

  pub fn entry_path(&self) -> PathBuf {
    self.src.join(&self.entry)
  }

  pub fn shell_path(&self) -> PathBuf {
    self.src.join(&self.shell)
  }
}

/// Load `anza.json` from `project` if present and merge over convention defaults.
///
/// `src_hint` is the CLI `--src` value (default `"src"`), used when the manifest
/// omits `src`.
pub fn resolve(project: &Path, src_hint: &str) -> Resolved {
  let manifest_path = project.join("anza.json");
  let (manifest, present) = if manifest_path.is_file() {
    match std::fs::read_to_string(&manifest_path) {
      Ok(raw) => match serde_json::from_str::<AnzaManifest>(&raw) {
        Ok(m) => (m, true),
        Err(e) => {
          logs::error!("Invalid anza.json: {}", e);
          (AnzaManifest::default(), true)
        }
      },
      Err(_) => (AnzaManifest::default(), false),
    }
  } else {
    (AnzaManifest::default(), false)
  };

  let src_rel = manifest
    .src
    .as_deref()
    .unwrap_or(src_hint)
    .trim_matches('/')
    .trim_matches('\\');
  let src = project.join(src_rel);

  let pages = manifest
    .pages
    .clone()
    .unwrap_or_else(|| vec!["pages".into()]);

  let (sw, sw_explicit) = match &manifest.sw {
    Some(field) => (field.normalize(), true),
    None => (Vec::new(), false),
  };

  Resolved {
    project: project.to_path_buf(),
    src,
    entry: manifest.entry.unwrap_or_else(|| "app.js".into()),
    shell: manifest.shell.unwrap_or_else(|| "index.html".into()),
    root_dock: manifest.root_dock.unwrap_or_else(|| "main".into()),
    pages,
    docks: manifest.docks.unwrap_or_else(|| "docks".into()),
    views: manifest.views.unwrap_or_else(|| "views".into()),
    parts: manifest.parts.unwrap_or_else(|| "parts".into()),
    tokens: manifest.tokens.unwrap_or_else(|| "tokens".into()),
    styles: manifest.styles.unwrap_or_else(|| "styles".into()),
    sw,
    sw_explicit,
    manifest_present: present,
  }
}

/// Load slots for import-order rewrite (defaults when no anza.json).
pub fn load_slots(project: &Path) -> Slots {
  let r = resolve(project, "src");
  r.slots().for_order()
}

#[allow(dead_code)]
pub fn default_sw_field() -> SwField {
  SwField::One("sw.js".into())
}

#[cfg(test)]
mod tests {
  use super::*;
  use std::fs;

  #[test]
  fn defaults_without_manifest() {
    let dir = std::env::temp_dir().join(format!("anza-struct-def-{}", std::process::id()));
    let _ = fs::remove_dir_all(&dir);
    fs::create_dir_all(&dir).unwrap();
    let r = resolve(&dir, "src");
    assert!(!r.manifest_present);
    assert_eq!(r.entry, "app.js");
    assert_eq!(r.pages, vec!["pages".to_string()]);
    assert!(!r.sw_explicit);
    let _ = fs::remove_dir_all(&dir);
  }
}
