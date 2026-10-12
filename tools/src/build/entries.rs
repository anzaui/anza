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
  let html_files: Vec<PathBuf> = walkdir::WalkDir::new(src)
    .sort_by_file_name()
    .into_iter()
    .filter_map(|e| e.ok())
    .map(|e| e.into_path())
    .filter(|p| p.extension().map_or(false, |e| e == "html"))
    .collect();

  // Parse each HTML file once, in parallel (order is kept by collect).
  let linked: Vec<(Vec<String>, Vec<String>)> = {
    use rayon::prelude::*;
    html_files.par_iter().map(|p| linked_assets(p)).collect()
  };

  for (path, (scripts, styles)) in html_files.iter().zip(linked) {
    // Add the HTML file itself to roots so that it is copied to dist.
    roots.push(path.clone());

    // Module scripts, then stylesheet links.
    for spec in scripts.into_iter().chain(styles) {
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

/// `<script type="module" src>` targets and `<link rel="stylesheet" href>`
/// targets of an HTML file, from a single parse.
fn linked_assets(path: &Path) -> (Vec<String>, Vec<String>) {
  let content = match std::fs::read_to_string(path) {
    Ok(c) => c,
    Err(_) => return (Vec::new(), Vec::new()),
  };
  // Ignore `<script>` samples inside `<view-code>` docs snippets.
  let content = crate::build::html::opaque_view_code(&content);
  let doc = scraper::Html::parse_document(&content);
  let select = |selector: &str, attr: &str| -> Vec<String> {
    match scraper::Selector::parse(selector) {
      Ok(sel) => doc
        .select(&sel)
        .filter_map(|el| el.value().attr(attr).map(|s| s.to_string()))
        .collect(),
      Err(_) => Vec::new(),
    }
  };
  (
    select("script[type=module][src]", "src"),
    select("link[rel=stylesheet][href]", "href"),
  )
}
