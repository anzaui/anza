// tools/src/build/merge.rs
//
// Production: one render-blocking stylesheet request per page head. After
// hashing, a run of adjacent `<link rel="stylesheet">` tags in a document's
// `<head>` (only whitespace between them, hashed files under `/assets/`) is
// replaced by one link to a hashed file holding the sheets concatenated in
// order (`tokens-styles-<hash>.css`). Separate sheets in document order
// cascade exactly like their concatenation, so nothing changes visually:
// `@layer` order, specificity and source order are kept. A run is left alone
// when a later sheet starts with a rule that must come first in a file
// (`@import`, `@charset`, `@namespace`).
//
// Only `<head>` links are merged. Shadow-root (DSD) stylesheet links stay as
// they are: they are scoped to their shadow root, and a document-level sheet
// (`:root`, `body`, global resets) must not leak into them.
//
// The per-route `Link` preloads (`Hints::styles`) point at the merged file;
// an original sheet is removed once no HTML, JS or JSON file names it.

use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use super::bundle::ASSETS;
use super::headers::Hints;

/// A stylesheet link in a document head.
struct Link {
  /// Byte range of the whole tag.
  start: usize,
  end: usize,
  /// `href` without the deploy base.
  url: String,
}

/// Merge adjacent head stylesheets. Returns the number of merged files.
pub fn run(dist: &Path, base: &str, hints: &mut [Hints]) -> Result<usize, Vec<String>> {
  let mut errors = Vec::new();
  let mut files: Vec<PathBuf> = walkdir::WalkDir::new(dist)
    .into_iter()
    .filter_map(|e| e.ok())
    .filter(|e| e.file_type().is_file())
    .map(|e| e.into_path())
    .collect();
  files.sort();

  // Run of original URLs -> merged URL (no deploy base).
  let mut merged: BTreeMap<Vec<String>, Option<String>> = BTreeMap::new();
  for file in files.iter().filter(|f| ext_of(f) == "html") {
    let Ok(text) = std::fs::read_to_string(file) else { continue };
    if !super::html::is_document(&text) {
      continue;
    }
    let mut out = String::with_capacity(text.len());
    let mut cursor = 0;
    for run in runs(&text, base) {
      let urls: Vec<String> = run.iter().map(|l| l.url.clone()).collect();
      let target = match merged.get(&urls) {
        Some(t) => t.clone(),
        None => {
          let t = match merge_files(dist, &urls) {
            Ok(t) => t,
            Err(err) => {
              errors.push(err);
              None
            }
          };
          merged.insert(urls.clone(), t.clone());
          t
        }
      };
      let Some(target) = target else { continue };
      out.push_str(&text[cursor..run[0].start]);
      out.push_str(&format!(
        "<link rel=\"stylesheet\" href=\"{}\" />",
        super::base::with_base(base, &target)
      ));
      cursor = run[run.len() - 1].end;
    }
    if cursor == 0 {
      continue;
    }
    out.push_str(&text[cursor..]);
    if let Err(err) = crate::fs_atomic::write(file, out.as_bytes()) {
      errors.push(format!("cannot write {}: {}", file.display(), err));
    }
  }
  let merged: BTreeMap<Vec<String>, String> = merged.into_iter().filter_map(|(k, v)| v.map(|v| (k, v))).collect();
  if merged.is_empty() {
    return if errors.is_empty() { Ok(0) } else { Err(errors) };
  }

  for hint in hints.iter_mut() {
    for (urls, target) in &merged {
      replace_run(&mut hint.styles, urls, target);
    }
  }

  // Originals nothing names any more.
  let mut corpus = String::new();
  for file in files.iter().filter(|f| matches!(ext_of(f), "html" | "js" | "mjs" | "json")) {
    if let Ok(t) = std::fs::read_to_string(file) {
      corpus.push_str(&t);
      corpus.push('\n');
    }
  }
  for urls in merged.keys() {
    for url in urls {
      if !corpus.contains(url.as_str()) {
        std::fs::remove_file(dist.join(url.trim_start_matches('/'))).ok();
      }
    }
  }

  if errors.is_empty() {
    Ok(merged.len())
  } else {
    Err(errors)
  }
}

fn ext_of(path: &Path) -> &str {
  path.extension().and_then(|e| e.to_str()).unwrap_or("")
}

/// Write the concatenation of `urls` as one hashed file. `None` when the
/// sheets can't be concatenated safely.
fn merge_files(dist: &Path, urls: &[String]) -> Result<Option<String>, String> {
  let mut css = String::new();
  let mut stems: Vec<&str> = Vec::new();
  for (i, url) in urls.iter().enumerate() {
    let path = dist.join(url.trim_start_matches('/'));
    let text = std::fs::read_to_string(&path).map_err(|e| format!("cannot read {}: {}", path.display(), e))?;
    if i > 0 && ["@import", "@charset", "@namespace"].iter().any(|r| text.contains(r)) {
      return Ok(None);
    }
    css.push_str(text.trim_end());
    css.push('\n');
    let name = url.rsplit('/').next().unwrap_or(url).trim_end_matches(".css");
    // `tokens-a5eb582d` -> `tokens` (strip the content hash).
    stems.push(match name.rsplit_once('-') {
      Some((stem, hash)) if hash.len() == 8 && hash.chars().all(|c| c.is_ascii_hexdigit()) => stem,
      _ => name,
    });
  }
  let name = super::hash::hashed_name(Path::new(&format!("{}.css", stems.join("-"))), css.as_bytes());
  let target = dist.join(ASSETS).join(&name);
  crate::fs_atomic::write(&target, css.as_bytes()).map_err(|e| format!("cannot write {}: {}", target.display(), e))?;
  Ok(Some(format!("/{}/{}", ASSETS, name)))
}

/// Replace the first occurrence of the sequence `run` in `styles` by `target`.
fn replace_run(styles: &mut Vec<String>, run: &[String], target: &str) {
  if run.is_empty() || styles.len() < run.len() {
    return;
  }
  if let Some(at) = (0..=styles.len() - run.len()).find(|&i| styles[i..i + run.len()] == *run) {
    styles.splice(at..at + run.len(), [target.to_string()]);
  }
}

/// Runs of two or more mergeable head stylesheet links, in order.
fn runs(html: &str, base: &str) -> Vec<Vec<Link>> {
  let lower = html.to_ascii_lowercase();
  let head_end = lower.find("</head>").unwrap_or(0);
  let prefix = format!("/{}/", ASSETS);
  let mut out: Vec<Vec<Link>> = Vec::new();
  let mut current: Vec<Link> = Vec::new();
  let mut at = 0;
  while let Some(pos) = lower[at..head_end].find("<link") {
    let start = at + pos;
    let Some(close) = lower[start..head_end].find('>') else { break };
    let end = start + close + 1;
    at = end;
    let link = stylesheet_href(&html[start..end])
      .map(|href| super::base::strip_base_prefix(&href, base))
      .filter(|url| url.starts_with(&prefix) && url.ends_with(".css") && !url[prefix.len()..].contains('/'))
      .map(|url| Link { start, end, url });
    let adjacent = current.last().map_or(false, |prev| html[prev.end..start].trim().is_empty());
    if !adjacent && current.len() > 1 {
      out.push(std::mem::take(&mut current));
    } else if !adjacent {
      current.clear();
    }
    match link {
      Some(link) => current.push(link),
      None => {
        if current.len() > 1 {
          out.push(std::mem::take(&mut current));
        }
        current.clear();
      }
    }
  }
  if current.len() > 1 {
    out.push(current);
  }
  out
}

/// The href of `<link rel="stylesheet" href="…">` with no other attributes
/// (a `media`, `disabled`, `title`, … link is never merged).
fn stylesheet_href(tag: &str) -> Option<String> {
  let inner = tag.strip_prefix("<link")?.trim_end_matches('>').trim_end_matches('/');
  let mut rel = None;
  let mut href = None;
  let mut rest = inner.trim_start();
  while !rest.is_empty() {
    let eq = rest.find('=')?;
    let name = rest[..eq].trim().to_ascii_lowercase();
    let value_part = rest[eq + 1..].trim_start();
    let quote = value_part.chars().next()?;
    if quote != '"' && quote != '\'' {
      return None;
    }
    let close = value_part[1..].find(quote)?;
    let value = value_part[1..1 + close].to_string();
    match name.as_str() {
      "rel" => rel = Some(value),
      "href" => href = Some(value),
      _ => return None,
    }
    rest = value_part[close + 2..].trim_start();
  }
  if rel?.eq_ignore_ascii_case("stylesheet") {
    href
  } else {
    None
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn parses_only_plain_stylesheet_links() {
    assert_eq!(stylesheet_href("<link rel=\"stylesheet\" href=\"/a.css\" />").as_deref(), Some("/a.css"));
    assert_eq!(stylesheet_href("<link href='/a.css' rel='stylesheet'>").as_deref(), Some("/a.css"));
    assert_eq!(stylesheet_href("<link rel=\"stylesheet\" href=\"/a.css\" media=\"print\" />"), None);
    assert_eq!(stylesheet_href("<link rel=\"preload\" href=\"/a.css\" as=\"style\" />"), None);
  }

  #[test]
  fn merges_adjacent_head_sheets_only() {
    let dist = std::env::temp_dir().join(format!("anza-merge-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dist);
    std::fs::create_dir_all(dist.join("assets")).unwrap();
    std::fs::create_dir_all(dist.join("docs")).unwrap();
    std::fs::write(dist.join("assets/tokens-11111111.css"), ":root{--a:1}@font-face{src:url(\"f.woff2\")}").unwrap();
    std::fs::write(dist.join("assets/styles-22222222.css"), "@layer base{body{margin:0}}").unwrap();
    std::fs::write(dist.join("assets/docs-33333333.css"), ".x{color:red}").unwrap();
    let page = |links: &str| {
      format!(
        "<!DOCTYPE html>\n<html><head>\n{}\n  <link rel=\"preload\" href=\"/base/assets/docs-33333333.css\" as=\"style\" />\n</head><body><x-d><template shadowrootmode=\"open\"><link rel=\"stylesheet\" href=\"/base/assets/docs-33333333.css\" /></template></x-d></body></html>",
        links
      )
    };
    let two = "  <link rel=\"stylesheet\" href=\"/base/assets/tokens-11111111.css\" />\n  <link rel=\"stylesheet\" href=\"/base/assets/styles-22222222.css\" />";
    std::fs::write(dist.join("index.html"), page(two)).unwrap();
    std::fs::write(dist.join("docs/index.html"), page(two)).unwrap();
    let mut hints = vec![Hints {
      path: "/docs".into(),
      styles: vec!["/assets/tokens-11111111.css".into(), "/assets/styles-22222222.css".into(), "/assets/docs-33333333.css".into()],
      modules: vec![],
    }];

    assert_eq!(run(&dist, "/base", &mut hints).unwrap(), 1);
    let html = std::fs::read_to_string(dist.join("docs/index.html")).unwrap();
    let merged = &hints[0].styles[0];
    assert!(merged.starts_with("/assets/tokens-styles-") && merged.ends_with(".css"), "{}", merged);
    assert_eq!(hints[0].styles[1], "/assets/docs-33333333.css");
    assert!(html.contains(&format!("<head>\n  <link rel=\"stylesheet\" href=\"/base{}\" />\n  <link rel=\"preload\"", merged)), "{}", html);
    // The shadow-root link is untouched and its file kept; merged originals removed.
    assert!(html.contains("<template shadowrootmode=\"open\"><link rel=\"stylesheet\" href=\"/base/assets/docs-33333333.css\" />"));
    assert!(dist.join("assets/docs-33333333.css").exists());
    assert!(!dist.join("assets/tokens-11111111.css").exists());
    let css = std::fs::read_to_string(dist.join(merged.trim_start_matches('/'))).unwrap();
    assert_eq!(css, ":root{--a:1}@font-face{src:url(\"f.woff2\")}\n@layer base{body{margin:0}}\n");
    let _ = std::fs::remove_dir_all(&dist);
  }

  #[test]
  fn keeps_runs_with_leading_at_rules_and_separated_links() {
    let html = "<html><head><link rel=\"stylesheet\" href=\"/assets/a-1.css\"><style>x{}</style><link rel=\"stylesheet\" href=\"/assets/b-2.css\"></head></html>";
    assert!(runs(html, "").is_empty());
    let html = "<html><head><link rel=\"stylesheet\" href=\"/assets/a-1.css\"> <link rel=\"stylesheet\" href=\"/assets/b-2.css\"></head></html>";
    assert_eq!(runs(html, "").len(), 1);
    let html = "<html><head><link rel=\"stylesheet\" href=\"/styles/a.css\"><link rel=\"stylesheet\" href=\"/assets/b-2.css\"></head></html>";
    assert!(runs(html, "").is_empty());

    let dist = std::env::temp_dir().join(format!("anza-merge-at-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dist);
    std::fs::create_dir_all(dist.join("assets")).unwrap();
    std::fs::write(dist.join("assets/a-1.css"), "a{}").unwrap();
    std::fs::write(dist.join("assets/b-2.css"), "@import url(x.css);b{}").unwrap();
    let urls = vec!["/assets/a-1.css".to_string(), "/assets/b-2.css".to_string()];
    assert_eq!(merge_files(&dist, &urls).unwrap(), None);
    let _ = std::fs::remove_dir_all(&dist);
  }
}
