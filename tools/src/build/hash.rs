// tools/src/build/hash.rs
//
// Production: content-hashed static assets (DIST step 6, AUDIT R5). After
// SSG and before bundling, every stylesheet, font and image in dist gets a
// copy at `/assets/<name>-<hash>.<ext>`, and the references the build knows
// about point at it:
//
//   - HTML `href`/`src` values (head links, preloads, DSD stylesheet links),
//   - quoted root-absolute string literals in JS modules and routes.json,
//   - `url()` in stylesheets (fonts and images),
//   - the per-route `Link` preloads in `_headers`.
//
// `/assets/*` is then served `immutable` (see headers.rs). Fonts and images
// keep their original file too (a script or a manifest may build the URL at
// run time, and `/favicon.ico` is requested by name); a stylesheet's
// original is removed when nothing refers to it any more. Page templates
// (`template.html`) are fetched relative to their module and stay where
// they are, `no-cache` like HTML. Bundled JS chunks are hashed by Rolldown.
//
// The precache list of the service worker is generated afterwards
// ([`precache`]): `self.__ANZA_PRECACHE__` at the top of `dist/sw.js`.

use std::collections::{BTreeMap, BTreeSet};
use std::path::{Path, PathBuf};

use super::bundle::ASSETS;
use super::headers::Hints;

/// Leaf assets: copied with a hashed name, originals kept.
const LEAF_EXT: &[&str] = &[
  "svg", "png", "jpg", "jpeg", "gif", "webp", "avif", "ico", "woff", "woff2", "ttf", "otf",
];

/// 64-bit FNV-1a: stable across toolchains and runs (only names a file).
fn fnv1a(bytes: &[u8]) -> u64 {
  let mut hash: u64 = 0xcbf2_9ce4_8422_2325;
  for b in bytes {
    hash ^= u64::from(*b);
    hash = hash.wrapping_mul(0x0000_0100_0000_01b3);
  }
  hash
}

/// `<stem>-<hash>.<ext>`; `index.*` files take their folder's name.
pub(crate) fn hashed_name(rel: &Path, bytes: &[u8]) -> String {
  let ext = rel.extension().and_then(|e| e.to_str()).unwrap_or("");
  let mut stem = rel.file_stem().and_then(|s| s.to_str()).unwrap_or("asset").to_string();
  if stem == "index" {
    if let Some(dir) = rel.parent().and_then(|p| p.file_name()).and_then(|n| n.to_str()) {
      stem = dir.to_string();
    }
  }
  let stem: String = stem
    .chars()
    .map(|c| if c.is_ascii_alphanumeric() || c == '_' || c == '-' { c } else { '-' })
    .collect();
  format!("{}-{:08x}.{}", stem, (fnv1a(bytes) >> 32) as u32, ext)
}

fn site_url(rel: &Path) -> String {
  format!("/{}", rel.to_string_lossy().replace('\\', "/"))
}

fn ext_of(path: &Path) -> &str {
  path.extension().and_then(|e| e.to_str()).unwrap_or("")
}

/// Hash dist assets and rewrite references. Returns old URL -> new URL
/// (site-root, no deploy base) and maps the stylesheets in `hints`.
pub fn run(dist: &Path, base: &str, hints: &mut [Hints]) -> Result<BTreeMap<String, String>, Vec<String>> {
  let mut errors = Vec::new();
  let assets_dir = dist.join(ASSETS);
  let mut files: Vec<PathBuf> = walkdir::WalkDir::new(dist)
    .into_iter()
    .filter_map(|e| e.ok())
    .filter(|e| e.file_type().is_file())
    .map(|e| e.into_path())
    .filter(|p| !p.starts_with(&assets_dir))
    .collect();
  files.sort();

  let mut map: BTreeMap<String, String> = BTreeMap::new();
  let write = |rel: &Path, bytes: &[u8], map: &mut BTreeMap<String, String>, errors: &mut Vec<String>| {
    let name = hashed_name(rel, bytes);
    let target = assets_dir.join(&name);
    if let Err(err) = crate::fs_atomic::write(&target, bytes) {
      errors.push(format!("cannot write {}: {}", target.display(), err));
      return;
    }
    map.insert(site_url(rel), format!("/{}/{}", ASSETS, name));
  };

  // 0. Only files referenced by URL (from HTML, JS, JSON, or from such a
  // stylesheet's url()) are hashed; e.g. the token partials that Lightning
  // CSS already inlined into tokens/index.css are not.
  let mut text = String::new();
  for file in files.iter().filter(|f| matches!(ext_of(f), "html" | "js" | "mjs" | "json")) {
    if let Ok(t) = std::fs::read_to_string(file) {
      text.push_str(&t);
      text.push('\n');
    }
  }
  let named = |rel: &Path| text.contains(&site_url(rel));
  let sheets_used: Vec<&PathBuf> = files
    .iter()
    .filter(|f| ext_of(f) == "css" && named(f.strip_prefix(dist).unwrap_or(f)))
    .collect();
  let mut from_css: BTreeSet<String> = BTreeSet::new();
  for sheet in &sheets_used {
    let rel = sheet.strip_prefix(dist).unwrap_or(sheet);
    if let Ok(css) = std::fs::read_to_string(sheet) {
      from_css.extend(css_url_targets(&css, rel, base));
    }
  }

  // 1. Fonts and images.
  for file in files.iter().filter(|f| LEAF_EXT.contains(&ext_of(f))) {
    let rel = file.strip_prefix(dist).unwrap_or(file);
    if !named(rel) && !from_css.contains(&site_url(rel)) {
      continue;
    }
    match std::fs::read(file) {
      Ok(bytes) => write(rel, &bytes, &mut map, &mut errors),
      Err(err) => errors.push(format!("cannot read {}: {}", file.display(), err)),
    }
  }
  // 2. Stylesheets, with url() pointing at the hashed leaves (same folder).
  let mut sheets: Vec<PathBuf> = Vec::new();
  for file in sheets_used {
    let rel = file.strip_prefix(dist).unwrap_or(file);
    match std::fs::read_to_string(file) {
      Ok(css) => {
        let css = rewrite_css_urls(&css, rel, base, &map);
        write(rel, css.as_bytes(), &mut map, &mut errors);
        sheets.push(file.clone());
      }
      Err(err) => errors.push(format!("cannot read {}: {}", file.display(), err)),
    }
  }
  if map.is_empty() {
    return if errors.is_empty() { Ok(map) } else { Err(errors) };
  }

  // 3. References: HTML href/src attributes (never page text, which may
  // show paths in code samples); quoted string literals in JS and JSON.
  let with_base = |p: &str| super::base::with_base(base, p);
  let mut forms: Vec<(String, String)> = Vec::new();
  for (old, new) in &map {
    if !base.is_empty() {
      forms.push((with_base(old), with_base(new)));
    }
    forms.push((old.clone(), new.clone()));
  }
  let mut html_patterns: Vec<String> = Vec::new();
  let mut html_replacements: Vec<String> = Vec::new();
  let mut code_patterns: Vec<String> = Vec::new();
  let mut code_replacements: Vec<String> = Vec::new();
  for (from, to) in &forms {
    for attr in ["href", "src"] {
      for q in ['"', '\''] {
        html_patterns.push(format!("{attr}={q}{from}{q}"));
        html_replacements.push(format!("{attr}={q}{to}{q}"));
      }
    }
    for q in ['"', '\'', '`'] {
      code_patterns.push(format!("{q}{from}{q}"));
      code_replacements.push(format!("{q}{to}{q}"));
    }
  }
  let build = |patterns: &[String]| {
    aho_corasick::AhoCorasick::builder()
      .match_kind(aho_corasick::MatchKind::LeftmostLongest)
      .build(patterns)
      .map_err(|err| vec![format!("asset hashing: {}", err)])
  };
  let html_matcher = build(&html_patterns)?;
  let code_matcher = build(&code_patterns)?;
  let mut corpus = String::new();
  for file in &files {
    let (matcher, replacements) = match ext_of(file) {
      "html" => (&html_matcher, &html_replacements),
      "js" | "mjs" | "json" => (&code_matcher, &code_replacements),
      _ => continue,
    };
    let Ok(text) = std::fs::read_to_string(file) else { continue };
    let next = matcher.replace_all(&text, replacements);
    if next != text {
      if let Err(err) = crate::fs_atomic::write(file, next.as_bytes()) {
        errors.push(format!("cannot write {}: {}", file.display(), err));
      }
    }
    corpus.push_str(&next);
    corpus.push('\n');
  }

  // 4. Stylesheet originals nothing refers to any more.
  for sheet in &sheets {
    let rel = sheet.strip_prefix(dist).unwrap_or(sheet);
    let url = site_url(rel);
    let name = rel.file_name().and_then(|n| n.to_str()).unwrap_or("");
    let relative_use = sibling_modules_mention(sheet, name);
    if !corpus.contains(&url) && !relative_use {
      std::fs::remove_file(sheet).ok();
    }
  }

  for hint in hints.iter_mut() {
    for style in hint.styles.iter_mut() {
      if let Some(new) = map.get(style.as_str()) {
        *style = new.clone();
      }
    }
  }

  if errors.is_empty() {
    Ok(map)
  } else {
    Err(errors)
  }
}

/// A JS module or HTML file in the stylesheet's folder (or below) names it,
/// e.g. `style: './index.css'`: it may be fetched relative to the module.
fn sibling_modules_mention(sheet: &Path, name: &str) -> bool {
  let Some(dir) = sheet.parent() else { return false };
  let Ok(entries) = std::fs::read_dir(dir) else { return false };
  for entry in entries.flatten() {
    let path = entry.path();
    if matches!(ext_of(&path), "js" | "mjs") {
      if std::fs::read_to_string(&path).map_or(false, |t| t.contains(name)) {
        return true;
      }
    }
  }
  false
}

/// The site-root URL a `url()` value points at, plus its `?`/`#` suffix.
/// None for external, data and empty URLs.
fn css_url_target<'a>(value: &'a str, rel: &Path, base: &str) -> Option<(String, &'a str)> {
  let dir = rel.parent().unwrap_or(Path::new(""));
  let (path, suffix) = match value.find(|c| c == '?' || c == '#') {
    Some(i) => (&value[..i], &value[i..]),
    None => (value, ""),
  };
  if path.starts_with("data:") || path.contains("://") || path.starts_with("//") || path.is_empty() {
    None
  } else if let Some(root) = path.strip_prefix('/') {
    let root = format!("/{}", root);
    let root = if !base.is_empty() { super::base::strip_base_prefix(&root, base) } else { root };
    Some((root, suffix))
  } else {
    Some((site_url(&normalize(&dir.join(path))), suffix))
  }
}

/// Every local `url()` target of a stylesheet (site-root URLs).
fn css_url_targets(css: &str, rel: &Path, base: &str) -> Vec<String> {
  let mut out = Vec::new();
  let mut rest = css;
  while let Some(at) = rest.find("url(") {
    rest = &rest[at + 4..];
    let Some(close) = rest.find(')') else { break };
    let value = rest[..close].trim().trim_matches(|c| c == '"' || c == '\'');
    if let Some((target, _)) = css_url_target(value, rel, base) {
      out.push(target);
    }
    rest = &rest[close..];
  }
  out
}

/// Point `url()` references at hashed files (relative: the sheet itself
/// moves to `/assets/`). Unknown, external and data URLs stay.
fn rewrite_css_urls(css: &str, rel: &Path, base: &str, map: &BTreeMap<String, String>) -> String {
  let mut out = String::with_capacity(css.len());
  let mut rest = css;
  while let Some(at) = rest.find("url(") {
    out.push_str(&rest[..at + 4]);
    rest = &rest[at + 4..];
    let close = match rest.find(')') {
      Some(c) => c,
      None => break,
    };
    let raw = &rest[..close];
    let value = raw.trim().trim_matches(|c| c == '"' || c == '\'');
    let found = css_url_target(value, rel, base).and_then(|(t, suffix)| map.get(&t).map(|n| (n, suffix)));
    match found {
      Some((new, suffix)) => {
        let name = new.rsplit('/').next().unwrap_or(new);
        out.push_str(&format!("\"{}{}\"", name, suffix));
      }
      None => out.push_str(raw),
    }
    rest = &rest[close..];
  }
  out.push_str(rest);
  out
}

fn normalize(path: &Path) -> PathBuf {
  let mut out = PathBuf::new();
  for comp in path.components() {
    match comp {
      std::path::Component::ParentDir => {
        out.pop();
      }
      std::path::Component::CurDir => {}
      other => out.push(other.as_os_str()),
    }
  }
  out
}

/// Generate the service worker precache list: the app shell, the module
/// scripts it loads and every hashed script and stylesheet (fonts are cached
/// when first used). Written as
/// `self.__ANZA_PRECACHE__ = [...]` at the top of `dist/sw.js`; the worker
/// falls back to its own list when it runs unbuilt.
pub fn precache(dist: &Path, base: &str) -> Result<usize, String> {
  let sw = dist.join("sw.js");
  if !sw.is_file() {
    return Ok(0);
  }
  let mut urls: BTreeSet<String> = BTreeSet::new();
  let mut list: Vec<String> = Vec::new();
  let mut push = |url: String, list: &mut Vec<String>| {
    if urls.insert(url.clone()) {
      list.push(url);
    }
  };
  if dist.join("index.html").is_file() {
    push("/index.html".to_string(), &mut list);
    if let Ok(html) = std::fs::read_to_string(dist.join("index.html")) {
      for src in module_srcs(&html) {
        let url = super::base::strip_base_prefix(&src, base);
        if url.starts_with('/') && dist.join(url.trim_start_matches('/')).is_file() {
          push(url, &mut list);
        }
      }
    }
  }
  let mut hashed: Vec<String> = std::fs::read_dir(dist.join(ASSETS))
    .map(|it| {
      it.flatten()
        .filter_map(|e| e.file_name().to_str().map(str::to_string))
        .filter(|n| matches!(n.rsplit('.').next(), Some("js" | "css")))
        .collect()
    })
    .unwrap_or_default();
  hashed.sort();
  for name in hashed {
    push(format!("/{}/{}", ASSETS, name), &mut list);
  }
  let list: Vec<String> = list.iter().map(|u| super::base::with_base(base, u)).collect();
  let source = std::fs::read_to_string(&sw).map_err(|e| format!("cannot read {}: {}", sw.display(), e))?;
  let line = format!(
    "self.__ANZA_PRECACHE__={};\n",
    serde_json::to_string(&list).unwrap_or_else(|_| "[]".into())
  );
  crate::fs_atomic::write(&sw, format!("{}{}", line, source).as_bytes())?;
  Ok(list.len())
}

/// `src` values of `<script type="module" src=…>` tags.
fn module_srcs(html: &str) -> Vec<String> {
  let mut out = Vec::new();
  let mut rest = html;
  while let Some(at) = rest.find("<script") {
    rest = &rest[at..];
    let end = rest.find('>').unwrap_or(rest.len());
    let tag = &rest[..end];
    if tag.contains("type=\"module\"") {
      if let Some(i) = tag.find(" src=\"") {
        let v = &tag[i + 6..];
        if let Some(j) = v.find('"') {
          out.push(v[..j].to_string());
        }
      }
    }
    rest = &rest[end.min(rest.len())..];
    if rest.len() <= 1 {
      break;
    }
    rest = &rest[1..];
  }
  out
}

#[cfg(test)]
mod tests {
  use super::*;

  fn tmp(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!("anza-hash-{}-{}", name, std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    dir
  }

  #[test]
  fn names_are_stable_and_index_takes_the_folder() {
    let a = hashed_name(Path::new("styles/shared.css"), b"x");
    assert_eq!(a, hashed_name(Path::new("styles/shared.css"), b"x"));
    assert!(a.starts_with("shared-") && a.ends_with(".css") && a.len() == "shared-".len() + 8 + 4);
    assert!(hashed_name(Path::new("tokens/index.css"), b"x").starts_with("tokens-"));
    assert_ne!(a, hashed_name(Path::new("styles/shared.css"), b"y"));
  }

  #[test]
  fn hashes_assets_and_rewrites_references() {
    let dist = tmp("run");
    std::fs::create_dir_all(dist.join("styles")).unwrap();
    std::fs::create_dir_all(dist.join("fonts")).unwrap();
    std::fs::create_dir_all(dist.join("docs/a")).unwrap();
    std::fs::write(dist.join("fonts/inter.woff2"), b"font").unwrap();
    std::fs::write(dist.join("styles/shared.css"), "@font-face{src:url(../fonts/inter.woff2) format(\"woff2\")}").unwrap();
    std::fs::write(dist.join("docs/a/index.css"), ".a{}").unwrap();
    std::fs::write(dist.join("docs/a/index.js"), "page('/a',{style:['/styles/shared.css'],template:{css:'./index.css'}})").unwrap();
    std::fs::write(dist.join("index.html"), "<link rel=\"stylesheet\" href=\"/styles/shared.css\" />").unwrap();
    std::fs::write(dist.join("sw.js"), "import x from './sw/index.js';").unwrap();
    let mut hints = vec![Hints { path: "/".into(), styles: vec!["/styles/shared.css".into()], modules: vec![] }];

    let map = run(&dist, "", &mut hints).unwrap();
    let shared = &map["/styles/shared.css"];
    let font = &map["/fonts/inter.woff2"];
    assert!(shared.starts_with("/assets/shared-"));
    let css = std::fs::read_to_string(dist.join(shared.trim_start_matches('/'))).unwrap();
    assert!(css.contains(&format!("url(\"{}\")", font.rsplit('/').next().unwrap())), "{}", css);
    let html = std::fs::read_to_string(dist.join("index.html")).unwrap();
    assert!(html.contains(&format!("href=\"{}\"", shared)), "{}", html);
    let js = std::fs::read_to_string(dist.join("docs/a/index.js")).unwrap();
    assert!(js.contains(&format!("'{}'", shared)), "{}", js);
    assert_eq!(hints[0].styles[0], *shared);
    // Unreferenced original removed; relative-referenced and fonts kept.
    assert!(!dist.join("styles/shared.css").exists());
    assert!(dist.join("docs/a/index.css").exists());
    assert!(dist.join("fonts/inter.woff2").exists());

    std::fs::write(dist.join("index.html"), "<script type=\"module\" src=\"/assets/app-1234abcd.js\"></script>").unwrap();
    std::fs::write(dist.join("assets/app-1234abcd.js"), "x").unwrap();
    let n = precache(&dist, "").unwrap();
    let sw = std::fs::read_to_string(dist.join("sw.js")).unwrap();
    assert!(sw.starts_with("self.__ANZA_PRECACHE__=[\"/index.html\",\"/assets/app-1234abcd.js\","), "{}", sw);
    assert!(sw.contains(shared.as_str()));
    assert!(n >= 3);
    let _ = std::fs::remove_dir_all(&dist);
  }
}
