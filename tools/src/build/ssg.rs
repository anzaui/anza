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
  /// Concrete expansion values from Phase 5 (`ssgParams` in routes.json).
  #[serde(default)]
  #[serde(rename = "ssgParams")]
  ssg_params: HashMap<String, String>,
}

#[derive(Debug, Deserialize)]
struct RoutesManifest {
  routes: Vec<RouteInfo>,
}

/// Optional project SEO config from `ssg.json` (and `ANZA_SITE_ORIGIN` override).
#[derive(Debug, Clone, Deserialize, Default)]
struct SsgSiteConfig {
  /// Absolute site origin, e.g. `https://example.com` (no trailing slash).
  #[serde(default)]
  origin: Option<String>,
  /// Display name for JSON-LD WebSite (defaults to "Anza").
  #[serde(default)]
  #[serde(rename = "siteName")]
  site_name: Option<String>,
  /// Emit JSON-LD WebSite/WebPage in SSG `<head>` (default true).
  #[serde(default = "default_true")]
  #[serde(rename = "jsonLd")]
  json_ld: bool,
  /// Emit `sitemap.xml` (default true).
  #[serde(default = "default_true")]
  sitemap: bool,
  /// Emit `robots.txt` (default true).
  #[serde(default = "default_true")]
  robots: bool,
}

fn default_true() -> bool {
  true
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

  let site = load_site_config(src_dir);
  let importmap = load_importmap(dist_dir);
  let docks = collect_docks(&manifest.routes);

  let mut emitted = 0usize;
  let mut ssg_paths: Vec<String> = Vec::new();
  for route in &manifest.routes {
    if !should_ssg(route) {
      continue;
    }
    match emit_route(src_dir, dist_dir, route, &docks, &importmap, &site) {
      Ok(()) => {
        emitted += 1;
        ssg_paths.push(normalize_route_path(&route.path));
      }
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

  if let Err(err) = emit_seo_extras(dist_dir, &site, &ssg_paths) {
    logs::warn!("SSG SEO extras failed: {}", err);
  }
}

/// Eligibility: honor `ssg` when present; else `/` and `/docs/**`.
/// Parametric patterns (`:param` / `*` / non-empty `params`) are never emitted —
/// only concrete expanded paths (empty params, no `:`) qualify.
fn should_ssg(route: &RouteInfo) -> bool {
  // Dock registry rows use bare names ("docs") — never SSG those.
  if !route.path.starts_with('/') {
    return false;
  }
  // Parametric patterns need expansion first (Phase 5 → concrete path records).
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
  site: &SsgSiteConfig,
) -> Result<(), String> {
  let out_path = output_path(dist_dir, &route.path);
  if let Some(parent) = out_path.parent() {
    std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
  }

  let page_html = read_page_html(src_dir, dist_dir, route)?;
  let page_html = interpolate_params(&page_html, &route.ssg_params);
  let page_css = read_page_css(src_dir, dist_dir, route);
  let page_css = interpolate_params(&page_css, &route.ssg_params);

  let h1_text = extract_h1_text(&page_html);
  let h1_inner = extract_h1_inner_html(&page_html);
  let first_p = extract_first_p_text(&page_html);

  let seo = route.seo.clone().unwrap_or_default();
  let title = non_empty(seo.title.clone().map(|t| interpolate_params(&t, &route.ssg_params)))
    .or_else(|| non_empty(h1_text.clone()))
    .unwrap_or_else(|| title_from_path(&route.path));
  let description = non_empty(
    seo
      .description
      .clone()
      .map(|d| interpolate_params(&d, &route.ssg_params)),
  )
  .or_else(|| non_empty(first_p))
  .unwrap_or_else(|| format!("{} — Anza documentation", title));
  let path_canonical = non_empty(
    seo
      .canonical
      .clone()
      .map(|c| interpolate_params(&c, &route.ssg_params)),
  )
  .unwrap_or_else(|| normalize_route_path(&route.path));
  let canonical = absolutize(site.origin.as_deref(), &path_canonical);

  let body = build_dsd_tree(src_dir, dist_dir, route, docks, &page_html, &page_css, h1_inner.as_deref())?;
  let head_extra = build_head(
    route,
    docks,
    importmap,
    &title,
    &description,
    &canonical,
    &seo,
    site,
  );

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

  // CSR soft-nav fetches `template.html` relative to the page module. When that
  // path is `./index.html`, it collides with this SSG document — the leaf then
  // mounts a full nested dock tree in its shadow (stacked docs chrome). Preserve
  // the fragment beside the SSG page and rewrite the dist module + routes.json.
  preserve_csr_template(dist_dir, route, &out_path, &page_html)?;

  std::fs::write(&out_path, html).map_err(|e| e.to_string())?;
  logs::compiler!("SSG {}", out_path.display());
  Ok(())
}

/// When the page fragment path equals the SSG `index.html` output, keep the
/// fragment as `template.html` and point the built page module at it.
fn preserve_csr_template(
  dist_dir: &Path,
  route: &RouteInfo,
  ssg_out: &Path,
  page_html: &str,
) -> Result<(), String> {
  let Some(file) = route.file.as_deref() else {
    return Ok(());
  };
  let html_rel = route.html.as_deref().unwrap_or("./index.html");
  if html_rel.starts_with('/') {
    // Absolute site-root templates never share the route's index.html slot.
    return Ok(());
  }

  let fragment_dist = {
    let base = Path::new(file);
    let parent = base.parent().unwrap_or_else(|| Path::new(""));
    dist_dir.join(normalize_rel(&parent.join(html_rel)))
  };

  // Only rewrite when SSG would clobber the CSR fragment.
  if fragment_dist != ssg_out {
    return Ok(());
  }

  let preserve_path = ssg_out
    .parent()
    .unwrap_or_else(|| Path::new(""))
    .join("template.html");
  std::fs::write(&preserve_path, page_html).map_err(|e| e.to_string())?;

  let js_path = dist_dir.join(file);
  if js_path.exists() {
    let src = std::fs::read_to_string(&js_path).map_err(|e| e.to_string())?;
    let rewritten = rewrite_template_html_path(&src, html_rel, "./template.html");
    if rewritten != src {
      std::fs::write(&js_path, rewritten).map_err(|e| e.to_string())?;
    }
  }

  rewrite_routes_html_field(dist_dir, &route.path, "./template.html")?;
  logs::compiler!(
    "SSG preserved CSR fragment {} → {}",
    fragment_dist.display(),
    preserve_path.display()
  );
  Ok(())
}

fn rewrite_template_html_path(source: &str, from: &str, to: &str) -> String {
  // Match both `html: './index.html'` and `html: "./index.html"`.
  let patterns = [
    format!("html: '{}'", from),
    format!("html: \"{}\"", from),
  ];
  let mut out = source.to_string();
  for pat in patterns {
    let replacement = if pat.contains('\'') {
      format!("html: '{}'", to)
    } else {
      format!("html: \"{}\"", to)
    };
    out = out.replace(&pat, &replacement);
  }
  out
}

fn rewrite_routes_html_field(dist_dir: &Path, route_path: &str, new_html: &str) -> Result<(), String> {
  let routes_path = dist_dir.join("routes.json");
  let content = std::fs::read_to_string(&routes_path).map_err(|e| e.to_string())?;
  let mut value: serde_json::Value =
    serde_json::from_str(&content).map_err(|e| e.to_string())?;
  let Some(routes) = value.get_mut("routes").and_then(|r| r.as_array_mut()) else {
    return Ok(());
  };
  for route in routes {
    let path = route.get("path").and_then(|p| p.as_str()).unwrap_or("");
    if path == route_path {
      if let Some(obj) = route.as_object_mut() {
        obj.insert("html".into(), serde_json::Value::String(new_html.into()));
      }
      break;
    }
  }
  let pretty = serde_json::to_string_pretty(&value).map_err(|e| e.to_string())?;
  std::fs::write(&routes_path, pretty + "\n").map_err(|e| e.to_string())?;
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
  site: &SsgSiteConfig,
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

  if site.json_ld {
    head.push_str(&json_ld_script(site, title, description, canonical, &route.path));
  }

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

/// Open DSD host with **light-DOM** children after the template.
///
/// Nested custom-element hosts MUST be siblings of `<template shadowrootmode>`,
/// not descendants of it. Shadow + slots only project light-DOM children of the
/// host; hosts baked into the parent's shadow template never slot and break
/// hard-refresh / SSG nesting (cascade adopt looks at `parent.children`).
fn dsd_host(tag: &str, attrs: &str, shadow_inner: &str, light_children: &str) -> String {
  format!(
    "<{tag}{attrs}>\n<template shadowrootmode=\"open\">\n{shadow}\n</template>\n{light}</{tag}>",
    tag = tag,
    attrs = attrs,
    shadow = shadow_inner,
    light = light_children,
  )
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
  let shadow = format!("{}{}", style_block(page_css), page_html.trim());
  let mut inner = dsd_host(
    &route.tag,
    " class=\"page-content\"",
    &shadow,
    &light_dom_heading(light_h1),
  );

  // Wrap via chain from leaf → root so outer docks contain inner ones.
  // Each wrap attaches the previous tree as a light-DOM child (after the
  // parent's DSD template) so slots project the nested hosts.
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
    let shadow = format!("{}{}", style_block(&css), body.trim());
    // Trailing newline keeps nested host indentation readable in View Source.
    let light = format!("{}\n", inner);
    inner = dsd_host(&dock.tag, attrs, &shadow, &light);
  }

  Ok(inner)
}

fn resolve_dock(name: &str, docks: &HashMap<String, DockInfo>, route: &RouteInfo, src_dir: &Path) -> DockInfo {
  if let Some(d) = docks.get(name) {
    return d.clone();
  }

  // Accept custom element tag as alias for the registry key
  // (e.g. via entry "dock-doccontent" → dock registered as "content").
  if let Some(d) = docks.values().find(|d| d.tag == name) {
    return d.clone();
  }
  if let Some(stripped) = name.strip_prefix("dock-") {
    if let Some(d) = docks.get(stripped) {
      return d.clone();
    }
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

/// Replace `{{name}}` placeholders using Phase 5 expansion values.
fn interpolate_params(input: &str, values: &HashMap<String, String>) -> String {
  if values.is_empty() || !input.contains("{{") {
    return input.to_string();
  }
  let mut out = input.to_string();
  for (k, v) in values {
    out = out.replace(&format!("{{{{{}}}}}", k), v);
  }
  out
}

/// Load `ssg.json` from `src_dir` or its parent; `ANZA_SITE_ORIGIN` overrides origin.
fn load_site_config(src_dir: &Path) -> SsgSiteConfig {
  let mut cfg = SsgSiteConfig {
    origin: None,
    site_name: None,
    json_ld: true,
    sitemap: true,
    robots: true,
  };
  let candidates = [
    src_dir.join("ssg.json"),
    src_dir
      .parent()
      .map(|p| p.join("ssg.json"))
      .unwrap_or_else(|| src_dir.join("ssg.json")),
  ];
  for path in &candidates {
    let Ok(text) = std::fs::read_to_string(path) else {
      continue;
    };
    match serde_json::from_str::<SsgSiteConfig>(&text) {
      Ok(parsed) => {
        cfg = parsed;
        logs::info!("Loaded SSG site config from {}", path.display());
        break;
      }
      Err(err) => {
        logs::warn!("Invalid ssg.json at {}: {}", path.display(), err);
      }
    }
  }
  if let Ok(env_origin) = std::env::var("ANZA_SITE_ORIGIN") {
    let trimmed = env_origin.trim();
    if !trimmed.is_empty() {
      cfg.origin = Some(trimmed.to_string());
    }
  }
  if let Some(ref mut origin) = cfg.origin {
    while origin.ends_with('/') {
      origin.pop();
    }
    if origin.is_empty() {
      cfg.origin = None;
    }
  }
  cfg
}

fn normalize_route_path(path: &str) -> String {
  if path.is_empty() || path == "/" {
    "/".to_string()
  } else if path.ends_with('/') && path.len() > 1 {
    path.trim_end_matches('/').to_string()
  } else {
    path.to_string()
  }
}

/// Join optional origin with a path or absolute URL.
fn absolutize(origin: Option<&str>, path_or_url: &str) -> String {
  let raw = path_or_url.trim();
  if raw.starts_with("http://") || raw.starts_with("https://") {
    return raw.to_string();
  }
  let path = normalize_route_path(raw);
  match origin {
    Some(origin) if !origin.is_empty() => {
      if path == "/" {
        format!("{}/", origin.trim_end_matches('/'))
      } else {
        format!("{}{}", origin.trim_end_matches('/'), path)
      }
    }
    _ => path,
  }
}

fn json_ld_script(
  site: &SsgSiteConfig,
  title: &str,
  description: &str,
  canonical: &str,
  route_path: &str,
) -> String {
  let site_name = site
    .site_name
    .as_deref()
    .filter(|s| !s.is_empty())
    .unwrap_or("Anza");
  let site_url = absolutize(site.origin.as_deref(), "/");
  let page_url = canonical.to_string();

  let mut graph = Vec::new();
  // WebSite on every public page (small, crawler-friendly).
  graph.push(serde_json::json!({
    "@type": "WebSite",
    "name": site_name,
    "url": site_url,
  }));
  graph.push(serde_json::json!({
    "@type": "WebPage",
    "name": title,
    "description": description,
    "url": page_url,
    "isPartOf": { "@type": "WebSite", "name": site_name, "url": site_url },
  }));
  // Silence unused in case we branch later.
  let _ = route_path;

  let doc = serde_json::json!({
    "@context": "https://schema.org",
    "@graph": graph,
  });
  let compact = serde_json::to_string(&doc).unwrap_or_else(|_| "{}".to_string());
  format!(
    "  <script type=\"application/ld+json\">{}</script>\n",
    compact
  )
}

fn emit_seo_extras(
  dist_dir: &Path,
  site: &SsgSiteConfig,
  ssg_paths: &[String],
) -> Result<(), String> {
  let mut paths = ssg_paths.to_vec();
  paths.sort();
  paths.dedup();

  if site.sitemap {
    emit_sitemap(dist_dir, site.origin.as_deref(), &paths)?;
  }
  if site.robots {
    emit_robots(dist_dir, site.origin.as_deref())?;
  }
  Ok(())
}

fn emit_sitemap(dist_dir: &Path, origin: Option<&str>, paths: &[String]) -> Result<(), String> {
  if origin.is_none() {
    logs::info!(
      "SSG sitemap: no site origin configured — <loc> uses site-root paths. Set ssg.json \"origin\" or ANZA_SITE_ORIGIN for absolute URLs."
    );
  }
  let mut xml = String::from(
    r#"<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
"#,
  );
  for path in paths {
    let loc = absolutize(origin, path);
    xml.push_str("  <url>\n");
    xml.push_str(&format!("    <loc>{}</loc>\n", escape_xml(&loc)));
    xml.push_str("  </url>\n");
  }
  xml.push_str("</urlset>\n");
  let dest = dist_dir.join("sitemap.xml");
  std::fs::write(&dest, xml).map_err(|e| e.to_string())?;
  logs::success!("SSG wrote {}", dest.display());
  Ok(())
}

fn emit_robots(dist_dir: &Path, origin: Option<&str>) -> Result<(), String> {
  let sitemap_href = absolutize(origin, "/sitemap.xml");
  let body = format!(
    "User-agent: *\nAllow: /\n\nSitemap: {}\n",
    sitemap_href
  );
  let dest = dist_dir.join("robots.txt");
  std::fs::write(&dest, body).map_err(|e| e.to_string())?;
  logs::success!("SSG wrote {}", dest.display());
  Ok(())
}

fn escape_xml(s: &str) -> String {
  s.replace('&', "&amp;")
    .replace('<', "&lt;")
    .replace('>', "&gt;")
    .replace('"', "&quot;")
    .replace('\'', "&apos;")
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
      ssg_params: HashMap::new(),
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

    let expanded = RouteInfo {
      path: "/docs/ssg/expand/foo".into(),
      ssg: Some(true),
      ssg_params: {
        let mut m = HashMap::new();
        m.insert("slug".into(), "foo".into());
        m
      },
      ..page.clone()
    };
    assert!(should_ssg(&expanded));

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
  fn interpolates_ssg_params() {
    let mut values = HashMap::new();
    values.insert("slug".into(), "foo".into());
    assert_eq!(
      interpolate_params("<h1>Expand: {{slug}}</h1>", &values),
      "<h1>Expand: foo</h1>"
    );
    assert_eq!(interpolate_params("static", &values), "static");
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

  #[test]
  fn rewrite_template_html_path_quotes() {
    let src = "page('/x', { template: { html: './index.html' } });";
    let out = rewrite_template_html_path(src, "./index.html", "./template.html");
    assert!(out.contains("html: './template.html'"));
    assert!(!out.contains("html: './index.html'"));

    let src2 = r#"page('/x', { template: { html: "./index.html" } });"#;
    let out2 = rewrite_template_html_path(src2, "./index.html", "./template.html");
    assert!(out2.contains(r#"html: "./template.html""#));
  }

  #[test]
  fn dsd_host_puts_children_in_light_dom_after_template() {
    let html = dsd_host(
      "dock-docs",
      "",
      "<style></style>\n<slot></slot>",
      "<dock-doccontent>\n<template shadowrootmode=\"open\">\n<slot></slot>\n</template>\n</dock-doccontent>\n",
    );

    let tpl_open = html.find("<template shadowrootmode=\"open\">").expect("open tpl");
    let tpl_close = html.find("</template>").expect("close tpl");
    let child = html.find("<dock-doccontent>").expect("child host");
    assert!(
      tpl_open < tpl_close && tpl_close < child,
      "child host must be a light-DOM sibling after </template>, got:\n{html}"
    );
    // Child must not appear inside the parent's shadow template body.
    let shadow_body = &html[tpl_open..tpl_close];
    assert!(
      !shadow_body.contains("<dock-doccontent>"),
      "nested host must not live inside parent DSD template:\n{html}"
    );
  }

  #[test]
  fn dsd_host_leaf_keeps_light_heading_outside_shadow() {
    let html = dsd_host(
      "doc-intro-start",
      " class=\"page-content\"",
      "<style></style>\n<h1>Start</h1>",
      "  <h1>Start</h1>\n",
    );
    let tpl_close = html.find("</template>").expect("close tpl");
    let light_h1 = html.rfind("<h1>Start</h1>").expect("light h1");
    assert!(tpl_close < light_h1);
  }

  #[test]
  fn absolutize_joins_origin() {
    assert_eq!(absolutize(None, "/docs/x"), "/docs/x");
    assert_eq!(
      absolutize(Some("https://example.com"), "/docs/x"),
      "https://example.com/docs/x"
    );
    assert_eq!(
      absolutize(Some("https://example.com/"), "/"),
      "https://example.com/"
    );
    assert_eq!(
      absolutize(Some("https://example.com"), "https://other.test/a"),
      "https://other.test/a"
    );
  }

  #[test]
  fn json_ld_contains_website_and_webpage() {
    let site = SsgSiteConfig {
      origin: Some("https://example.com".into()),
      site_name: Some("Anza".into()),
      json_ld: true,
      sitemap: true,
      robots: true,
    };
    let script = json_ld_script(&site, "Start", "Desc", "https://example.com/docs/x", "/docs/x");
    assert!(script.contains("application/ld+json"));
    assert!(script.contains("WebSite"));
    assert!(script.contains("WebPage"));
    assert!(script.contains("https://example.com/docs/x"));
  }
}
