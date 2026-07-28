// tools/src/build/ssg.rs
//
// Mode A SSG: emit contentful HTML with open Declarative Shadow DOM for each
// public / SSG-eligible route. Writes dist/<route>/index.html (and dist/index.html
// for `/`) so plain static hosts can hard-refresh without JS.

use std::collections::HashMap;
use std::path::{Path, PathBuf};

use serde::Deserialize;

/// SEO metadata optionally emitted by the routes extractor (sibling contract).
#[derive(Debug, Clone, Deserialize, Default)]
struct SeoMeta {
  #[serde(default)]
  title: Option<String>,
  #[serde(default)]
  description: Option<String>,
  #[serde(default)]
  canonical: Option<String>,
  #[serde(default)]
  #[serde(rename = "og:title")]
  og_title: Option<String>,
  #[serde(default)]
  #[serde(rename = "og:description")]
  og_description: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Default)]
struct RouteInfo {
  tag: String,
  path: String,
  #[serde(default)]
  file: Option<String>,
  #[serde(default)]
  html: Option<String>,
  #[serde(default)]
  css: Option<String>,
  #[serde(default)]
  via: Vec<String>,
  #[serde(default)]
  params: Vec<String>,
  #[serde(default)]
  layouts: Vec<String>,
  #[serde(default)]
  templates: Vec<String>,
  #[serde(default)]
  styles: Vec<String>,
  /// Sibling contract: explicit SSG opt-in/out.
  #[serde(default)]
  ssg: Option<bool>,
  /// Sibling contract: when `ssg` is absent, `public: false` skips emission.
  #[serde(default)]
  public: Option<bool>,
  #[serde(default)]
  seo: Option<SeoMeta>,
}

#[derive(Debug, Deserialize)]
struct RoutesManifest {
  routes: Vec<RouteInfo>,
}

#[derive(Debug, Clone)]
struct DockInfo {
  tag: String,
  file: Option<String>,
  html: Option<String>,
  css: Vec<String>,
}

/// Emit SSG HTML for every eligible route into `dist_dir`.
///
/// Must run after `routes.json` exists and the import graph has copied assets.
/// Prefer reading component templates from `src_dir` (unpolluted); fall back to
/// `dist_dir` when needed.
pub fn emit(src_dir: &Path, dist_dir: &Path) {
  let routes_path = dist_dir.join("routes.json");
  let content = match std::fs::read_to_string(&routes_path) {
    Ok(c) => c,
    Err(err) => {
      logs::warn!("SSG skipped: cannot read {}: {}", routes_path.display(), err);
      return;
    }
  };

  let manifest: RoutesManifest = match serde_json::from_str(&content) {
    Ok(m) => m,
    Err(err) => {
      logs::warn!("SSG skipped: invalid routes.json: {}", err);
      return;
    }
  };

  let importmap = load_importmap(dist_dir);
  let docks = collect_docks(&manifest.routes);

  let mut emitted = 0usize;
  for route in &manifest.routes {
    if !should_ssg(route) {
      continue;
    }
    match emit_route(src_dir, dist_dir, route, &docks, &importmap) {
      Ok(()) => emitted += 1,
      Err(err) => {
        logs::warn!("SSG failed for {}: {}", route.path, err);
      }
    }
  }

  if emitted > 0 {
    logs::success!("SSG emitted {} HTML page(s) into {}", emitted, dist_dir.display());
  } else {
    logs::info!("SSG: no eligible routes to emit");
  }
}

/// v1 eligibility: no params; honor `ssg` when present; else `/` and `/docs/**`.
fn should_ssg(route: &RouteInfo) -> bool {
  // Dock registry rows use bare names ("docs") — never SSG those.
  if !route.path.starts_with('/') {
    return false;
  }
  // Parametric routes need a build-time expansion manifest (not in v1).
  if !route.params.is_empty() || route.path.contains(':') || route.path.contains('*') {
    return false;
  }
  if let Some(ssg) = route.ssg {
    return ssg;
  }
  if let Some(false) = route.public {
    return false;
  }
  // Early-integration fallback while sibling flags are absent.
  route.path == "/" || route.path.starts_with("/docs")
}

fn collect_docks(routes: &[RouteInfo]) -> HashMap<String, DockInfo> {
  let mut docks = HashMap::new();
  for route in routes {
    // Dock definitions are emitted with path == dock name (no leading '/').
    if route.path.starts_with('/') {
      continue;
    }
    let mut css = Vec::new();
    if let Some(ref c) = route.css {
      css.push(c.clone());
    }
    for s in &route.styles {
      if !css.contains(s) {
        css.push(s.clone());
      }
    }
    let info = DockInfo {
      tag: route.tag.clone(),
      file: route.file.clone(),
      html: route.html.clone(),
      css,
    };
    docks.insert(route.path.clone(), info.clone());
    // Also key by name derived from tag when tag is dock-<name>.
    if let Some(name) = route.tag.strip_prefix("dock-") {
      docks.entry(name.to_string()).or_insert(info);
    }
  }
  docks
}

fn emit_route(
  src_dir: &Path,
  dist_dir: &Path,
  route: &RouteInfo,
  docks: &HashMap<String, DockInfo>,
  importmap: &str,
) -> Result<(), String> {
  let out_path = output_path(dist_dir, &route.path);
  if let Some(parent) = out_path.parent() {
    std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
  }

  let page_html = read_page_html(src_dir, dist_dir, route)?;
  let page_css = read_page_css(src_dir, dist_dir, route);

  let h1_text = extract_h1_text(&page_html);
  let h1_inner = extract_h1_inner_html(&page_html);
  let first_p = extract_first_p_text(&page_html);

  let seo = route.seo.clone().unwrap_or_default();
  let title = non_empty(seo.title.clone())
    .or_else(|| non_empty(h1_text.clone()))
    .unwrap_or_else(|| title_from_path(&route.path));
  let description = non_empty(seo.description.clone())
    .or_else(|| non_empty(first_p))
    .unwrap_or_else(|| format!("{} — Anza documentation", title));
  let canonical = non_empty(seo.canonical.clone()).unwrap_or_else(|| route.path.clone());

  let body = build_dsd_tree(src_dir, dist_dir, route, docks, &page_html, &page_css, h1_inner.as_deref())?;
  let head_extra = build_head(route, docks, importmap, &title, &description, &canonical, &seo);

  let html = format!(
    r#"<!DOCTYPE html>
<html lang="en">
<head>
{head}
</head>
<body>
{body}
</body>
</html>
"#,
    head = head_extra,
    body = body,
  );

  std::fs::write(&out_path, html).map_err(|e| e.to_string())?;
  logs::compiler!("SSG {}", out_path.display());
  Ok(())
}

fn output_path(dist_dir: &Path, path: &str) -> PathBuf {
  if path == "/" {
    dist_dir.join("index.html")
  } else {
    let trimmed = path.trim_start_matches('/');
    dist_dir.join(trimmed).join("index.html")
  }
}

fn build_head(
  route: &RouteInfo,
  docks: &HashMap<String, DockInfo>,
  importmap: &str,
  title: &str,
  description: &str,
  canonical: &str,
  seo: &SeoMeta,
) -> String {
  let mut head = String::new();
  head.push_str("  <meta charset=\"utf-8\" />\n");
  head.push_str("  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n");
  head.push_str(&format!("  <title>{}</title>\n", escape_html(title)));
  head.push_str(&format!(
    "  <meta name=\"description\" content=\"{}\" />\n",
    escape_attr(description)
  ));
  head.push_str(&format!(
    "  <link rel=\"canonical\" href=\"{}\" />\n",
    escape_attr(canonical)
  ));

  let og_title = seo.og_title.as_deref().unwrap_or(title);
  let og_desc = seo.og_description.as_deref().unwrap_or(description);
  head.push_str(&format!(
    "  <meta property=\"og:title\" content=\"{}\" />\n",
    escape_attr(og_title)
  ));
  head.push_str(&format!(
    "  <meta property=\"og:description\" content=\"{}\" />\n",
    escape_attr(og_desc)
  ));
  head.push_str(&format!(
    "  <meta property=\"og:url\" content=\"{}\" />\n",
    escape_attr(canonical)
  ));
  head.push_str("  <meta name=\"twitter:card\" content=\"summary\" />\n");

  // Import map before any module scripts (inline — same as production graph inject).
  if !importmap.is_empty() {
    head.push_str("  <script type=\"importmap\">\n");
    head.push_str(importmap);
    head.push('\n');
    head.push_str("  </script>\n");
  } else {
    head.push_str("  <script type=\"importmap\" src=\"/importmap.json\"></script>\n");
  }

  head.push_str("  <link rel=\"stylesheet\" href=\"/tokens/index.css\" />\n");
  head.push_str("  <link rel=\"stylesheet\" href=\"/styles/index.css\" />\n");

  // Route-scoped modulepreload (mirrors tools/src/server/runner.rs).
  head.push_str("  <link rel=\"modulepreload\" href=\"/app.js\" />\n");

  let mut seen_modules = std::collections::HashSet::new();
  seen_modules.insert("/app.js".to_string());

  for via_name in &route.via {
    if let Some(dock) = docks.get(via_name) {
      if let Some(ref f) = dock.file {
        let href = format!("/{}", f.trim_start_matches('/'));
        if seen_modules.insert(href.clone()) {
          head.push_str(&format!("  <link rel=\"modulepreload\" href=\"{}\" />\n", href));
        }
      }
    }
  }
  for f in &route.layouts {
    let href = if f.starts_with('/') {
      f.clone()
    } else {
      format!("/{}", f)
    };
    if seen_modules.insert(href.clone()) {
      head.push_str(&format!("  <link rel=\"modulepreload\" href=\"{}\" />\n", href));
    }
  }
  if let Some(ref f) = route.file {
    let href = format!("/{}", f.trim_start_matches('/'));
    if seen_modules.insert(href.clone()) {
      head.push_str(&format!("  <link rel=\"modulepreload\" href=\"{}\" />\n", href));
    }
  }

  // Deferred entry — parser paints DSD first; modules upgrade later.
  head.push_str("  <script type=\"module\" src=\"/app.js\"></script>\n");
  head
}

fn build_dsd_tree(
  src_dir: &Path,
  dist_dir: &Path,
  route: &RouteInfo,
  docks: &HashMap<String, DockInfo>,
  page_html: &str,
  page_css: &str,
  light_h1: Option<&str>,
) -> Result<String, String> {
  // Innermost: the leaf page custom element with open DSD.
  // `class="page-content"` matches the client orchestrator's soft-nav marker so
  // boot/`found` reuses this leaf (adopt) instead of swapping a CSR clone over it.
  let mut inner = format!(
    "<{tag} class=\"page-content\">\n<template shadowrootmode=\"open\">\n{style}{body}\n</template>\n{light}</{tag}>",
    tag = route.tag,
    style = style_block(page_css),
    body = page_html.trim(),
    light = light_dom_heading(light_h1),
  );

  // Wrap via chain from leaf → root so outer docks contain inner ones.
  for via_name in route.via.iter().rev() {
    let dock = resolve_dock(via_name, docks, route, src_dir);
    let (tpl_html, tpl_css) = read_dock_assets(src_dir, dist_dir, &dock)?;
    let attrs = if via_name == "main" || dock.tag == "dock-main" {
      " id=\"main\""
    } else {
      ""
    };
    // Default dock passthrough is <slot></slot> (library dock.js).
    let body = if tpl_html.trim().is_empty() {
      "<slot></slot>".to_string()
    } else {
      tpl_html
    };
    let mut css = String::from(":host { contain: layout; display: block; }\n");
    css.push_str(&tpl_css);

    inner = format!(
      "<{tag}{attrs}>\n<template shadowrootmode=\"open\">\n{style}{body}\n</template>\n{child}\n</{tag}>",
      tag = dock.tag,
      attrs = attrs,
      style = style_block(&css),
      body = body.trim(),
      child = inner,
    );
  }

  Ok(inner)
}

fn resolve_dock(name: &str, docks: &HashMap<String, DockInfo>, route: &RouteInfo, src_dir: &Path) -> DockInfo {
  if let Some(d) = docks.get(name) {
    return d.clone();
  }

  // Infer from this route's layout/template/style lists (sibling layouts wiring).
  let needle = format!("docks/{}/", name);
  let file = route
    .layouts
    .iter()
    .find(|l| l.contains(&needle) || l.ends_with(&format!("docks/{}.js", name)))
    .cloned();
  let html = route
    .templates
    .iter()
    .find(|t| t.contains(&needle))
    .map(|t| t.clone())
    .or_else(|| {
      file.as_ref().map(|f| {
        let parent = Path::new(f).parent().unwrap_or(Path::new(""));
        format!("/{}/index.html", parent.display()).replace('\\', "/")
      })
    });
  let css: Vec<String> = route
    .styles
    .iter()
    .filter(|s| s.contains(&needle))
    .cloned()
    .collect();

  let tag = file
    .as_ref()
    .and_then(|f| parse_dock_tag(src_dir, f))
    .unwrap_or_else(|| format!("dock-{}", name));

  DockInfo {
    tag,
    file,
    html,
    css,
  }
}

/// Read `tag: '…'` from a dock module when the custom tag differs from `dock-<name>`.
fn parse_dock_tag(src_dir: &Path, file: &str) -> Option<String> {
  let path = src_dir.join(file);
  let text = std::fs::read_to_string(path).ok()?;
  // Prefer an explicit tag: 'dock-…' in the dock() config.
  for line in text.lines() {
    let trimmed = line.trim();
    if let Some(rest) = trimmed.strip_prefix("tag:") {
      let rest = rest.trim().trim_end_matches(',');
      let quoted = rest
        .trim()
        .trim_matches('\'')
        .trim_matches('"')
        .to_string();
      if !quoted.is_empty() && quoted.contains('-') {
        return Some(quoted);
      }
    }
  }
  None
}

fn style_block(css: &str) -> String {
  let trimmed = css.trim();
  if trimmed.is_empty() {
    String::new()
  } else {
    format!("<style>\n{}\n</style>\n", trimmed)
  }
}

fn light_dom_heading(h1_inner: Option<&str>) -> String {
  match h1_inner {
    Some(inner) if !inner.trim().is_empty() => {
      format!("  <h1>{}</h1>\n", inner.trim())
    }
    _ => String::new(),
  }
}

fn read_page_html(src_dir: &Path, dist_dir: &Path, route: &RouteInfo) -> Result<String, String> {
  let html_rel = route.html.as_deref().unwrap_or("./index.html");
  let file = route
    .file
    .as_deref()
    .ok_or_else(|| format!("route {} has no file", route.path))?;
  let path = resolve_asset_file(src_dir, dist_dir, file, html_rel);
  let raw = std::fs::read_to_string(&path)
    .map_err(|e| format!("read page html {}: {}", path.display(), e))?;
  Ok(strip_injected_importmap(&raw))
}

fn read_page_css(src_dir: &Path, dist_dir: &Path, route: &RouteInfo) -> String {
  let mut parts = Vec::new();
  let file = route.file.as_deref().unwrap_or("");
  let mut seen = std::collections::HashSet::new();

  let page_dir = route.file.as_ref().and_then(|f| {
    Path::new(f)
      .parent()
      .map(|p| format!("/{}", p.display()).replace('\\', "/"))
  });

  let mut candidates = Vec::new();
  if let Some(ref c) = route.css {
    candidates.push(c.clone());
  }
  for s in &route.styles {
    // Layout/dock styles are inlined into dock DSD — keep page DSD page-local.
    if s.contains("/docks/") {
      continue;
    }
    let local = page_dir
      .as_ref()
      .map(|d| s.starts_with(d) || s.starts_with("./"))
      .unwrap_or(false);
    let shared = s.starts_with("/styles/");
    if local || shared {
      candidates.push(s.clone());
    }
  }

  for c in candidates {
    if seen.insert(c.clone()) {
      if let Some(text) = read_css_asset(src_dir, dist_dir, file, &c) {
        parts.push(text);
      }
    }
  }
  parts.join("\n")
}

fn read_dock_assets(
  src_dir: &Path,
  dist_dir: &Path,
  dock: &DockInfo,
) -> Result<(String, String), String> {
  let file = dock.file.as_deref().unwrap_or("");
  let html = if let Some(ref h) = dock.html {
    // Absolute site-root paths from routes.templates, or relative to dock file.
    let path = if h.starts_with('/') {
      let rel = h.trim_start_matches('/');
      let from_src = src_dir.join(rel);
      if from_src.exists() {
        from_src
      } else {
        dist_dir.join(rel)
      }
    } else {
      resolve_asset_file(src_dir, dist_dir, file, h)
    };
    match std::fs::read_to_string(&path) {
      Ok(raw) => strip_injected_importmap(&raw),
      Err(_) => "<slot></slot>".to_string(),
    }
  } else {
    "<slot></slot>".to_string()
  };

  let mut css_parts = Vec::new();
  let mut seen = std::collections::HashSet::new();
  for c in &dock.css {
    if seen.insert(c.clone()) {
      if let Some(text) = read_css_asset(src_dir, dist_dir, file, c) {
        css_parts.push(text);
      }
    }
  }
  Ok((html, css_parts.join("\n")))
}

fn read_css_asset(src_dir: &Path, dist_dir: &Path, base_file: &str, asset: &str) -> Option<String> {
  let path = if asset.starts_with('/') {
    let rel = asset.trim_start_matches('/');
    let from_src = src_dir.join(rel);
    if from_src.exists() {
      from_src
    } else {
      dist_dir.join(rel)
    }
  } else if !base_file.is_empty() {
    resolve_asset_file(src_dir, dist_dir, base_file, asset)
  } else {
    return None;
  };
  std::fs::read_to_string(path).ok()
}

/// Resolve a relative asset against the defining JS file, preferring `src`.
fn resolve_asset_file(src_dir: &Path, dist_dir: &Path, base_file: &str, asset: &str) -> PathBuf {
  if asset.starts_with('/') {
    let rel = asset.trim_start_matches('/');
    let from_src = src_dir.join(rel);
    if from_src.exists() {
      return from_src;
    }
    return dist_dir.join(rel);
  }

  let base = Path::new(base_file);
  let parent = base.parent().unwrap_or_else(|| Path::new(""));
  let joined = parent.join(asset);
  let normalized = normalize_rel(&joined);

  let from_src = src_dir.join(&normalized);
  if from_src.exists() {
    from_src
  } else {
    dist_dir.join(&normalized)
  }
}

fn normalize_rel(path: &Path) -> PathBuf {
  let mut parts = Vec::new();
  for c in path.components() {
    match c {
      std::path::Component::ParentDir => {
        parts.pop();
      }
      std::path::Component::CurDir => {}
      std::path::Component::Normal(s) => parts.push(s.to_os_string()),
      _ => {}
    }
  }
  parts.iter().collect()
}

fn load_importmap(dist_dir: &Path) -> String {
  let path = dist_dir.join("importmap.json");
  match std::fs::read_to_string(&path) {
    Ok(text) => {
      // Pretty-print if valid JSON; otherwise pass through.
      if let Ok(val) = serde_json::from_str::<serde_json::Value>(&text) {
        serde_json::to_string_pretty(&val).unwrap_or(text)
      } else {
        text
      }
    }
    Err(_) => String::new(),
  }
}

/// Graph injects import maps into every copied .html — strip those from templates.
fn strip_injected_importmap(html: &str) -> String {
  crate::build::html::strip_importmap(html).trim().to_string()
}

fn extract_h1_text(html: &str) -> Option<String> {
  extract_tag_inner(html, "h1").map(|inner| strip_tags(&inner).trim().to_string())
}

fn extract_h1_inner_html(html: &str) -> Option<String> {
  extract_tag_inner(html, "h1").map(|s| s.trim().to_string())
}

fn extract_first_p_text(html: &str) -> Option<String> {
  extract_tag_inner(html, "p").map(|inner| {
    let text = strip_tags(&inner).trim().to_string();
    if text.len() > 160 {
      format!("{}…", &text[..157])
    } else {
      text
    }
  })
}

fn extract_tag_inner(html: &str, tag: &str) -> Option<String> {
  let open = format!("<{}", tag);
  let close = format!("</{}>", tag);
  let lower = html.to_ascii_lowercase();
  let open_l = open.to_ascii_lowercase();
  let close_l = close.to_ascii_lowercase();

  let mut search_from = 0usize;
  while let Some(rel) = lower[search_from..].find(&open_l) {
    let start = search_from + rel;
    let after_lt = start + open.len();
    let boundary = html.as_bytes().get(after_lt).copied().unwrap_or(b'>');
    // Require a real tag boundary so `<p` does not match `<path` / `<pre`.
    if !(boundary == b'>'
      || boundary == b' '
      || boundary == b'\n'
      || boundary == b'\r'
      || boundary == b'\t'
      || boundary == b'/')
    {
      search_from = after_lt;
      continue;
    }
    let gt = match html[after_lt..].find('>') {
      Some(i) => after_lt + i,
      None => return None,
    };
    // Skip self-closing tags.
    if html.as_bytes().get(gt.saturating_sub(1)) == Some(&b'/') {
      search_from = gt + 1;
      continue;
    }
    let content_start = gt + 1;
    let end = match lower[content_start..].find(&close_l) {
      Some(i) => content_start + i,
      None => return None,
    };
    return Some(html[content_start..end].to_string());
  }
  None
}

fn strip_tags(s: &str) -> String {
  let mut out = String::with_capacity(s.len());
  let mut in_tag = false;
  for c in s.chars() {
    match c {
      '<' => in_tag = true,
      '>' => in_tag = false,
      _ if !in_tag => out.push(c),
      _ => {}
    }
  }
  out
}

fn non_empty(s: Option<String>) -> Option<String> {
  s.and_then(|v| {
    let t = v.trim().to_string();
    if t.is_empty() {
      None
    } else {
      Some(t)
    }
  })
}

fn title_from_path(path: &str) -> String {
  if path == "/" {
    return "Anza".to_string();
  }
  path
    .trim_matches('/')
    .split('/')
    .last()
    .unwrap_or("Anza")
    .split(|c| c == '-' || c == '_')
    .filter(|s| !s.is_empty())
    .map(|s| {
      let mut chars = s.chars();
      match chars.next() {
        Some(f) => format!("{}{}", f.to_uppercase(), chars.as_str()),
        None => String::new(),
      }
    })
    .collect::<Vec<_>>()
    .join(" ")
}

fn escape_html(s: &str) -> String {
  s.replace('&', "&amp;")
    .replace('<', "&lt;")
    .replace('>', "&gt;")
}

fn escape_attr(s: &str) -> String {
  escape_html(s).replace('"', "&quot;")
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn should_ssg_fallback() {
    let page = RouteInfo {
      tag: "doc-x".into(),
      path: "/docs/intro/start".into(),
      file: None,
      html: None,
      css: None,
      via: vec![],
      params: vec![],
      layouts: vec![],
      templates: vec![],
      styles: vec![],
      ssg: None,
      public: None,
      seo: None,
    };
    assert!(should_ssg(&page));

    let root = RouteInfo {
      path: "/".into(),
      ..page.clone()
    };
    assert!(should_ssg(&root));

    let private = RouteInfo {
      path: "/account".into(),
      ..page.clone()
    };
    assert!(!should_ssg(&private));

    let parametric = RouteInfo {
      path: "/docs/:slug".into(),
      params: vec!["slug".into()],
      ..page.clone()
    };
    assert!(!should_ssg(&parametric));

    let flagged_off = RouteInfo {
      path: "/docs/x".into(),
      ssg: Some(false),
      ..page.clone()
    };
    assert!(!should_ssg(&flagged_off));

    let dock_row = RouteInfo {
      path: "docs".into(),
      ..page
    };
    assert!(!should_ssg(&dock_row));
  }

  #[test]
  fn output_paths() {
    let dist = Path::new("/tmp/dist");
    assert_eq!(output_path(dist, "/"), PathBuf::from("/tmp/dist/index.html"));
    assert_eq!(
      output_path(dist, "/docs/intro/start"),
      PathBuf::from("/tmp/dist/docs/intro/start/index.html")
    );
  }

  #[test]
  fn extracts_h1() {
    let html = "<h1 class=\"t\">Start</h1><p>Hi</p>";
    assert_eq!(extract_h1_text(html).as_deref(), Some("Start"));
  }
}
