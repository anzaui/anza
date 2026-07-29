// tools/src/build/entries.rs
//
// Entry-point discovery: gathers the root files that seed the import-graph
// walk. Includes CLI-provided entries, HTML module scripts / stylesheets,
// src/index.js fallback, and src/sw.js.

use std::path::{Path, PathBuf};

/// Gather all entry points starting from the source directory.
pub fn collect(src: &Path, entries: &[PathBuf]) -> Vec<PathBuf> {
  let mut roots: Vec<PathBuf> = Vec::new();

  for e in entries {
    roots.push(e.clone());
  }

  // HTML files under src contribute their module-script and stylesheet entry points.
  for item in walkdir::WalkDir::new(src)
    .into_iter()
    .filter_map(|e| e.ok())
  {
    let path = item.path();
    if path.extension().map_or(false, |e| e == "html") {
      // Add the HTML file itself to roots so that it is copied to dist.
      roots.push(path.to_path_buf());

      // Module scripts
      for spec in module_scripts(path) {
        if spec.starts_with("./") || spec.starts_with("../") || spec.starts_with('/') {
          let dir = path.parent().unwrap_or(src);
          let resolved = if let Some(stripped) = spec.strip_prefix("/dist/") {
            // Legacy /dist/ prefix (pre Phase 0); treat as site-root.
            src.join(stripped)
          } else if let Some(stripped) = spec.strip_prefix('/') {
            src.join(stripped)
          } else {
            dir.join(&spec)
          };
          roots.push(resolved);
        }
      }

      // Stylesheet links
      for spec in stylesheets(path) {
        if spec.starts_with("./") || spec.starts_with("../") || spec.starts_with('/') {
          let dir = path.parent().unwrap_or(src);
          let resolved = if let Some(stripped) = spec.strip_prefix("/dist/") {
            // Legacy /dist/ prefix (pre Phase 0); treat as site-root.
            src.join(stripped)
          } else if let Some(stripped) = spec.strip_prefix('/') {
            src.join(stripped)
          } else {
            dir.join(&spec)
          };
          roots.push(resolved);
        }
      }
    }
  }

  if roots.is_empty() {
    let index = src.join("index.js");
    if index.exists() {
      roots.push(index);
    }
  }

  // Service Worker is always an entry if present.
  let sw = src.join("sw.js");
  if sw.exists() {
    roots.push(sw);
  }

  roots
}

/// Extract `<script type="module" src="...">` targets from an HTML file.
fn module_scripts(path: &Path) -> Vec<String> {
  let content = match std::fs::read_to_string(path) {
    Ok(c) => c,
    Err(_) => return Vec::new(),
  };
  // Ignore `<script>` samples inside `<view-code>` docs snippets.
  let content = crate::build::html::opaque_view_code(&content);
  let doc = scraper::Html::parse_document(&content);
  let sel = match scraper::Selector::parse("script[type=module][src]") {
    Ok(s) => s,
    Err(_) => return Vec::new(),
  };
  doc
    .select(&sel)
    .filter_map(|el| el.value().attr("src").map(|s| s.to_string()))
    .collect()
}

/// Extract `<link rel="stylesheet" href="...">` targets from an HTML file.
fn stylesheets(path: &Path) -> Vec<String> {
  let content = match std::fs::read_to_string(path) {
    Ok(c) => c,
    Err(_) => return Vec::new(),
  };
  let content = crate::build::html::opaque_view_code(&content);
  let doc = scraper::Html::parse_document(&content);
  let sel = match scraper::Selector::parse("link[rel=stylesheet][href]") {
    Ok(s) => s,
    Err(_) => return Vec::new(),
  };
  doc
    .select(&sel)
    .filter_map(|el| el.value().attr("href").map(|s| s.to_string()))
    .collect()
}
