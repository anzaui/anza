//! Docs generator (`anza docs`), the single generator for docs/*.md:
//! - default: a standalone static site, laid out to be served at `site.base`
//!   (`<base>/x/page` → `<out>/x/page/index.html`, home → `<out>/index.html`,
//!   theme assets and fonts under `<base>/`);
//! - `--pages`: Anza page folders inside an app (`web/src/docs`), see [`pages`].
//!
//! The sidebar is generated from the docs folder tree (see [`sidebar`]) unless
//! config.toml lists `[[sidebar.section]]` explicitly.

mod config;
mod front;
pub mod pages;
mod sidebar;
mod transform;

use std::collections::BTreeSet;
use std::fs;
use std::path::{Path, PathBuf};

use walkdir::WalkDir;

use config::{DocsConfig, Files, SidebarItem, SidebarSection};
use transform::{md_to_html_body, route_from_md};

pub use config::load_config;

#[derive(Debug, Clone)]
pub struct DocsOptions {
  pub config: PathBuf,
  pub out: Option<PathBuf>,
  /// When true, only emit pages listed in sidebar + entry home (MVP default).
  pub sidebar_only: bool,
}

#[derive(Debug)]
struct Page {
  md_path: PathBuf,
  /// Absolute site route, e.g. `/docs/intro/start`
  route: String,
  title: String,
  body_html: String,
}

pub fn run(opts: &DocsOptions) -> Result<(), String> {
  let config_path = resolve_config(&opts.config)?;
  let mut cfg = load_config(&config_path)?;
  cfg.site.base = normalize_base(&cfg.site.base);
  let docs_root = config_path
    .parent()
    .ok_or_else(|| "config.toml has no parent directory".to_string())?
    .to_path_buf();
  if cfg.sidebar.is_empty() {
    let mut all = BTreeSet::new();
    collect_file_globs(&docs_root, &cfg.files, &mut all)?;
    let all: Vec<PathBuf> = all.into_iter().collect();
    cfg.sidebar = sidebar::generate(&docs_root, &all, &docs_root.join(&cfg.entry.home));
  }

  let out = opts
    .out
    .clone()
    .unwrap_or_else(|| resolve_out(&docs_root, &cfg.site.out));

  if out.exists() {
    fs::remove_dir_all(&out).map_err(|e| format!("clear {}: {e}", out.display()))?;
  }
  fs::create_dir_all(&out).map_err(|e| format!("mkdir {}: {e}", out.display()))?;

  let pages = collect_pages(&docs_root, &cfg, opts.sidebar_only)?;
  if pages.is_empty() {
    return Err("no markdown pages to emit".into());
  }

  copy_assets(&docs_root, &out, &cfg)?;
  write_view_code_loader(&out)?;
  write_app_js(&out, &cfg.site.base)?;
  write_chrome_css(&out)?;

  for page in &pages {
    emit_page(&out, &cfg, page)?;
  }

  emit_redirects(&out, &cfg)?;
  emit_root_index(&out, &cfg)?;
  emit_seo_files(&out, &cfg, &pages)?;

  if cfg.entry.landing {
    emit_landing(&out, &docs_root, &cfg)?;
  }

  anza_logs::success!(
    "Docs site generated → {} ({} pages)",
    out.display(),
    pages.len()
  );
  let at = format!("{}/", cfg.site.base);
  if cfg.site.base.is_empty() {
    anza_logs::info!("Serve {} at the domain root: cd {} && python3 -m http.server 8765", out.display(), out.display());
  } else {
    anza_logs::info!(
      "Serve {} at {at} (e.g. a `{}` symlink to it, then python3 -m http.server 8765 and open {at})",
      out.display(),
      cfg.site.base.trim_start_matches('/'),
    );
  }

  Ok(())
}

/// `"/rust/"` → `"/rust"`, `"rust"` → `"/rust"`, `"/"` or `""` → `""`.
fn normalize_base(base: &str) -> String {
  let trimmed = base.trim().trim_matches('/');
  if trimmed.is_empty() {
    String::new()
  } else {
    format!("/{trimmed}")
  }
}

/// Site path of a file in the out dir (`rel` without a leading slash).
fn asset_url(base: &str, rel: &str) -> String {
  format!("{base}/{rel}")
}

/// Out-dir folder of a route under `base` (`/rust/a/b` → `out/a/b`).
fn route_dir(out: &Path, route: &str, base: &str) -> Option<PathBuf> {
  let rest = if base.is_empty() { Some(route) } else { route.strip_prefix(base) }?;
  if !(rest.is_empty() || rest.starts_with('/')) {
    return None;
  }
  let rest = rest.trim_matches('/');
  Some(if rest.is_empty() { out.to_path_buf() } else { out.join(rest) })
}

/// Link to a route: the docs root gets its trailing slash (`/rust/`), so it
/// is fetched without a redirect.
fn route_href(route: &str, base: &str) -> String {
  if route == base || route.is_empty() {
    format!("{base}/")
  } else {
    route.to_string()
  }
}

fn resolve_config(path: &Path) -> Result<PathBuf, String> {
  let p = if path.is_absolute() {
    path.to_path_buf()
  } else {
    std::env::current_dir()
      .map_err(|e| e.to_string())?
      .join(path)
  };
  if p.is_file() {
    return Ok(p);
  }
  // Allow passing docs/ directory.
  let nested = p.join("config.toml");
  if nested.is_file() {
    return Ok(nested);
  }
  Err(format!(
    "docs config not found at {} (expected docs/config.toml)",
    path.display()
  ))
}

fn resolve_out(docs_root: &Path, configured: &str) -> PathBuf {
  let p = PathBuf::from(configured);
  if p.is_absolute() {
    return p;
  }
  // Prefer repo root (parent of docs/) for relative outs like tmp/docs-site.
  docs_root
    .parent()
    .unwrap_or(docs_root)
    .join(configured)
}

fn collect_pages(
  docs_root: &Path,
  cfg: &DocsConfig,
  sidebar_only: bool,
) -> Result<Vec<Page>, String> {
  let mut paths: BTreeSet<PathBuf> = BTreeSet::new();

  // Entry home
  paths.insert(docs_root.join(&cfg.entry.home));

  for section in &cfg.sidebar {
    for item in &section.items {
      if item.hide {
        continue;
      }
      paths.insert(docs_root.join(&item.path));
    }
  }

  if !sidebar_only {
    collect_file_globs(docs_root, &cfg.files, &mut paths)?;
  }

  let mut pages = Vec::new();
  for md_path in paths {
    if !md_path.is_file() {
      anza_logs::warn!("skip missing markdown: {}", md_path.display());
      continue;
    }
    let raw = fs::read_to_string(&md_path).map_err(|e| format!("read {}: {e}", md_path.display()))?;
    let (fm, body_md) = front::parse(&raw);
    let fm_title = fm.title;
    let route = if md_path == docs_root.join(&cfg.entry.home) {
      cfg.entry.route.clone()
    } else {
      route_from_md(&md_path, docs_root, &cfg.site.base)?
    };
    let body_html = md_to_html_body(&body_md, &md_path, docs_root, &cfg.site.base)?;
    let title = fm_title
      .or_else(|| first_h1_text(&body_html))
      .unwrap_or_else(|| route.clone());
    pages.push(Page {
      md_path,
      route,
      title,
      body_html,
    });
  }

  pages.sort_by(|a, b| a.route.cmp(&b.route));
  Ok(pages)
}


fn collect_file_globs(
  docs_root: &Path,
  files: &Files,
  paths: &mut BTreeSet<PathBuf>,
) -> Result<(), String> {
  let roots: Vec<PathBuf> = if files.roots.is_empty() {
    vec![docs_root.to_path_buf()]
  } else {
    files.roots.iter().map(|r| docs_root.join(r)).collect()
  };
  for root in roots {
    if !root.is_dir() {
      anza_logs::warn!("skip missing files.roots dir: {}", root.display());
      continue;
    }
    for entry in WalkDir::new(&root).into_iter().filter_map(|e| e.ok()) {
      let path = entry.path();
      if !path.is_file() { continue; }
      if path.extension().and_then(|e| e.to_str()) != Some("md") { continue; }
      let rel = path.strip_prefix(docs_root).unwrap_or(path).to_string_lossy();
      if rel.split(['/', '\\']).next().map_or(false, |first| first.starts_with('_')) {
        // `_app/` (pages overlay) and other `_`-prefixed folders are not docs.
        continue;
      }
      if !files.include.is_empty() && !files.include.iter().any(|g| path_matches_glob(&rel, g)) { continue; }
      if files.exclude.iter().any(|g| path_matches_glob(&rel, g)) { continue; }
      paths.insert(path.to_path_buf());
    }
  }
  Ok(())
}

/// Glob match on `/`-separated paths: `*` (within a segment), `**/` (any
/// number of folders), `**` (anything). A pattern without a folder also
/// matches the file name in any folder.
fn path_matches_glob(path: &str, pattern: &str) -> bool {
  let pattern = pattern.replace('\\', "/");
  let path = path.replace('\\', "/");
  if glob(pattern.as_bytes(), path.as_bytes()) {
    return true;
  }
  !pattern.contains('/') && glob(pattern.as_bytes(), path.rsplit('/').next().unwrap_or("").as_bytes())
}

fn glob(p: &[u8], s: &[u8]) -> bool {
  if p.is_empty() {
    return s.is_empty();
  }
  if p.starts_with(b"**/") {
    // Zero folders, or skip one segment and retry.
    if glob(&p[3..], s) {
      return true;
    }
    return match s.iter().position(|&c| c == b'/') {
      Some(i) => glob(p, &s[i + 1..]),
      None => false,
    };
  }
  if p.starts_with(b"**") {
    return (0..=s.len()).any(|i| glob(&p[2..], &s[i..]));
  }
  if p[0] == b'*' {
    let mut i = 0;
    loop {
      if glob(&p[1..], &s[i..]) {
        return true;
      }
      if i == s.len() || s[i] == b'/' {
        return false;
      }
      i += 1;
    }
  }
  !s.is_empty() && p[0] == s[0] && glob(&p[1..], &s[1..])
}

#[cfg(test)]
mod glob_tests {
  use super::path_matches_glob as m;

  #[test]
  fn globs() {
    assert!(m("index.md", "**/*.md"));
    assert!(m("intro/start.md", "**/*.md"));
    assert!(m("a/b/c.md", "**/*.md"));
    assert!(!m("a/b/c.txt", "**/*.md"));
    assert!(m("intro/start.md", "intro/*.md"));
    assert!(!m("intro/x/start.md", "intro/*.md"));
    assert!(m("intro/x/start.md", "intro/**"));
    assert!(m("intro/start.md", "start.md"));
    assert!(m("intro/start.md", "intro/start.md"));
    assert!(!m("intro/start.md", "other.md"));
  }
}

fn first_h1_text(html: &str) -> Option<String> {
  let html = crate::build::html::opaque_view_code(html);
  let open = html.find("<h1>").or_else(|| html.find("<h1 "))?;
  let start = html.get(open..)?.find('>')? + open + 1;
  let end = html.get(start..)?.find("</h1>")? + start;
  let inner = html.get(start..end)?;
  let text = strip_tags(inner).trim().to_string();
  if text.is_empty() {
    None
  } else {
    Some(text)
  }
}

fn strip_tags(s: &str) -> String {
  let mut out = String::new();
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

fn copy_assets(docs_root: &Path, out: &Path, cfg: &DocsConfig) -> Result<(), String> {
  let assets = &cfg.assets;
  let resolve = |p: &str| -> PathBuf {
    let path = PathBuf::from(p);
    if path.is_absolute() {
      path
    } else {
      docs_root.join(path)
    }
  };

  // Prefer a single pack root with conventional subfolders when set.
  if !assets.pack.is_empty() {
    let pack = resolve(&assets.pack);
    copy_pack_subdir(&pack, "styles", &out.join("styles"))?;
    copy_pack_subdir(&pack, "tokens", &out.join("tokens"))?;
    // views/code or view-code
    if pack.join("views").join("code").is_dir() {
      copy_dir_all(&pack.join("views").join("code"), &out.join("views").join("code"))?;
    } else if pack.join("view-code").is_dir() {
      copy_dir_all(&pack.join("view-code"), &out.join("views").join("code"))?;
    }
    if pack.join("images").is_dir() {
      copy_dir_all(&pack.join("images"), &out.join("images"))?;
    }
    if pack.join("docks").is_dir() {
      copy_dir_all(&pack.join("docks"), &out.join("docks"))?;
    }
  } else {
    // Explicit folder roots — copy whole directories (never enumerate CSS files).
    copy_dir_all(&resolve(&assets.styles), &out.join("styles"))?;
    copy_dir_all(&resolve(&assets.tokens), &out.join("tokens"))?;
    copy_dir_all(&resolve(&assets.view_code), &out.join("views").join("code"))?;
    copy_dir_all(&resolve(&assets.docks), &out.join("docks"))?;

    if !assets.images.is_empty() {
      let images = resolve(&assets.images);
      if images.is_dir() {
        copy_dir_all(&images, &out.join("images"))?;
      } else {
        anza_logs::warn!("assets.images not a directory: {}", images.display());
      }
    }
  }

  if let Some(name) = favicon_name(cfg) {
    let src = resolve(&assets.favicon);
    fs::copy(&src, out.join(name)).map_err(|e| format!("assets.favicon {}: {e}", src.display()))?;
  }

  // Theme CSS refers to site-root files (`url('/tokens/fonts/…')`): move them
  // under the base.
  if !cfg.site.base.is_empty() {
    for entry in WalkDir::new(out).into_iter().filter_map(|e| e.ok()) {
      let path = entry.path();
      if entry.file_type().is_file() && path.extension().map_or(false, |e| e == "css") {
        let css = fs::read_to_string(path).map_err(|e| format!("read {}: {e}", path.display()))?;
        let based = base_css_urls(&css, &cfg.site.base);
        if based != css {
          fs::write(path, based).map_err(|e| format!("write {}: {e}", path.display()))?;
        }
      }
    }
  }

  Ok(())
}

/// File name of `assets.favicon` in the out dir: `favicon.<ext>`.
fn favicon_name(cfg: &DocsConfig) -> Option<String> {
  if cfg.assets.favicon.is_empty() {
    return None;
  }
  match Path::new(&cfg.assets.favicon).extension().and_then(|e| e.to_str()) {
    Some(ext) => Some(format!("favicon.{}", ext.to_ascii_lowercase())),
    None => Some("favicon".into()),
  }
}

/// Prefix site-root `url(/…)` references (quoted or not) with `base`;
/// relative, protocol-relative (`//host`) and absolute URLs stay.
fn base_css_urls(css: &str, base: &str) -> String {
  let mut out = String::with_capacity(css.len());
  let mut rest = css;
  while let Some(i) = rest.find("url(") {
    let (head, tail) = rest.split_at(i + 4);
    out.push_str(head);
    let inner = tail.trim_start();
    out.push_str(&tail[..tail.len() - inner.len()]);
    let (quote, path) = match inner.chars().next() {
      Some(q @ ('\'' | '"')) => (Some(q), &inner[1..]),
      _ => (None, inner),
    };
    if let Some(q) = quote {
      out.push(q);
    }
    if path.starts_with('/') && !path.starts_with("//") {
      out.push_str(base);
    }
    rest = path;
  }
  out.push_str(rest);
  out
}

fn copy_pack_subdir(pack: &Path, name: &str, dest: &Path) -> Result<(), String> {
  let src = pack.join(name);
  if src.is_dir() {
    copy_dir_all(&src, dest)
  } else {
    Err(format!("pack missing {}/ under {}", name, pack.display()))
  }
}

fn copy_dir_all(src: &Path, dest: &Path) -> Result<(), String> {
  if !src.is_dir() {
    return Err(format!("asset dir missing: {}", src.display()));
  }
  fs::create_dir_all(dest).map_err(|e| e.to_string())?;
  for entry in walkdir::WalkDir::new(src).into_iter().filter_map(|e| e.ok()) {
    let path = entry.path();
    let rel = path.strip_prefix(src).unwrap();
    let target = dest.join(rel);
    if path.is_dir() {
      fs::create_dir_all(&target).map_err(|e| e.to_string())?;
    } else if path.is_file() {
      if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
      }
      fs::copy(path, &target).map_err(|e| e.to_string())?;
    }
  }
  Ok(())
}

fn write_view_code_loader(out: &Path) -> Result<(), String> {
  // Standalone CE for smoke without full Anza UI graph.
  let js = r#"/**
 * Generated view-code loader (MVP) — Prism highlight + copy.
 * Full Anza view('view-code') remains the production target.
 */
import './views/code/prism.js';

class ViewCode extends HTMLElement {
  connectedCallback() {
    const lang = this.getAttribute('language') || 'text';
    const text = (this.textContent || '').replace(/^\n/, '').replace(/\n$/, '');
    this.textContent = '';

    const wrap = document.createElement('div');
    wrap.className = 'code-block';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-btn';
    btn.setAttribute('aria-label', 'Copy');
    btn.textContent = 'Copy';
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = 'Copied';
        setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
      } catch (_) {}
    });

    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.className = `language-${lang}`;
    code.textContent = text;
    pre.appendChild(code);
    wrap.appendChild(btn);
    wrap.appendChild(pre);
    this.appendChild(wrap);

    if (window.Prism) {
      window.Prism.highlightElement(code);
    }
  }
}

if (!customElements.get('view-code')) {
  customElements.define('view-code', ViewCode);
}
"#;
  fs::write(out.join("view-code.js"), js).map_err(|e| e.to_string())
}

fn write_app_js(out: &Path, base: &str) -> Result<(), String> {
  let js = r#"/**
 * Generated by anza docs — soft navigation for the standalone docs site:
 * same-origin links under BASE swap .doc-body instead of reloading.
 */
import './view-code.js';

const BASE = __BASE__;

function inBase(pathname) {
  return BASE === '' ? pathname.startsWith('/') : pathname === BASE || pathname.startsWith(BASE + '/');
}

function indexUrl(pathname) {
  return `${pathname.replace(/\/+$/, '')}/index.html`;
}

function trim(path) {
  return path.replace(/\/+$/, '') || '/';
}

function highlightSidebar(pathname) {
  const path = trim(pathname);
  const links = document.querySelectorAll('.sidebar-nav a');
  let best = null;
  let bestLen = -1;
  for (const link of links) {
    const href = trim(new URL(link.href, location.href).pathname);
    if (path === href || (href !== '/' && path.startsWith(href + '/'))) {
      if (href.length > bestLen) {
        best = link;
        bestLen = href.length;
      }
    }
  }
  for (const link of links) {
    link.classList.toggle('active', link === best);
  }
}

function scrollToHash(url) {
  const anchor = url.hash && document.getElementById(decodeURIComponent(url.hash.slice(1)));
  if (anchor) anchor.scrollIntoView();
  return Boolean(anchor);
}

async function softNav(url, push) {
  const res = await fetch(indexUrl(url.pathname));
  if (!res.ok) {
    location.href = url.href;
    return;
  }
  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const next = doc.querySelector('.doc-body');
  const cur = document.querySelector('.doc-body');
  if (!next || !cur) {
    location.href = url.href;
    return;
  }
  cur.replaceChildren(...next.childNodes);
  document.title = doc.title;
  if (push) history.pushState({}, '', url.pathname + url.search + url.hash);
  highlightSidebar(url.pathname);
  // Nodes from DOMParser are not upgraded: replace each view-code with a fresh one.
  for (const el of cur.querySelectorAll('view-code')) {
    const neu = document.createElement('view-code');
    const lang = el.getAttribute('language');
    if (lang) neu.setAttribute('language', lang);
    neu.textContent = el.textContent;
    el.replaceWith(neu);
  }
  if (!scrollToHash(url) && push) window.scrollTo(0, 0);
}

document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest('a');
  if (!a || a.target || a.hasAttribute('download')) return;
  const href = a.getAttribute('href');
  if (!href || href.startsWith('#')) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || !inBase(url.pathname)) return;
  // Files (CSS, images, …) are not pages.
  if (/\.[a-z0-9]+$/i.test(url.pathname)) return;
  e.preventDefault();
  if (trim(url.pathname) === trim(location.pathname)) {
    history.pushState({}, '', url.pathname + url.search + url.hash);
    scrollToHash(url);
    return;
  }
  softNav(url, true);
});

window.addEventListener('popstate', () => {
  softNav(new URL(location.href), false);
});

highlightSidebar(location.pathname);
"#
  .replace("__BASE__", &serde_json::to_string(base).unwrap());
  fs::write(out.join("app.js"), js).map_err(|e| e.to_string())
}

fn write_chrome_css(out: &Path) -> Result<(), String> {
  // Minimal layout glue on top of docks chrome CSS + shared.css
  let css = r#"
html, body { margin: 0; padding: 0; min-height: 100%; }
body.docs-mvp {
  font-family: var(--font-sans, system-ui, sans-serif);
  background: var(--bg-color, #fff);
  color: var(--text-color, #111);
}
.docs-mvp .docs-header { position: sticky; top: 0; z-index: 10; }
.docs-mvp .doc-main {
  max-width: 52rem;
  margin: 0 auto;
  padding: 1.5rem 1.25rem 3rem;
}
.docs-mvp view-code { display: block; }
.docs-mvp .code-block {
  position: relative;
  border-radius: 12px;
  overflow: auto;
  background: var(--bg-code, #1e1e1e);
  color: #eee;
  padding: 0.75rem 1rem;
  margin: 1rem 0;
}
.docs-mvp .code-block pre { margin: 0; }
.docs-mvp .copy-btn {
  position: absolute;
  top: 8px;
  right: 10px;
  font-size: 0.75rem;
  cursor: pointer;
}
"#;
  fs::write(out.join("styles").join("mvp.css"), css).map_err(|e| e.to_string())
}

fn emit_page(out: &Path, cfg: &DocsConfig, page: &Page) -> Result<(), String> {
  let dir = route_dir(out, &page.route, &cfg.site.base).ok_or_else(|| {
    format!(
      "{}: route {} is outside site.base {:?}",
      page.md_path.display(),
      page.route,
      cfg.site.base
    )
  })?;
  fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
  let html = render_shell(cfg, page);
  fs::write(dir.join("index.html"), html).map_err(|e| e.to_string())
}

fn render_shell(cfg: &DocsConfig, page: &Page) -> String {
  let base = cfg.site.base.as_str();
  let url = |rel: &str| esc(&asset_url(base, rel));
  let sidebar = render_sidebar(cfg, &page.route);
  let title = format!("{} — {}", page.title, cfg.seo.site_name);
  let dock = &cfg.entry.root_dock;
  let body_class = if cfg.entry.shell.is_empty() {
    "docs-mvp".to_string()
  } else {
    format!("docs-mvp {}", esc(&cfg.entry.shell))
  };
  let home = esc(&route_href(&cfg.entry.route, base));
  let mut head_extras = String::new();
  if let Some(name) = favicon_name(cfg) {
    let kind = match Path::new(&name).extension().and_then(|e| e.to_str()) {
      Some("svg") => " type=\"image/svg+xml\"",
      Some("ico") => " type=\"image/x-icon\"",
      Some("png") => " type=\"image/png\"",
      _ => "",
    };
    head_extras.push_str(&format!("  <link rel=\"icon\" href=\"{}\"{kind} />\n", url(&name)));
  }
  let origin = cfg.seo.origin.trim_end_matches('/');
  let page_href = route_href(&page.route, base);
  if !origin.is_empty() {
    let canonical = format!("{origin}{page_href}");
    head_extras.push_str(&format!(
      "  <link rel=\"canonical\" href=\"{}\" />\n",
      esc(&canonical)
    ));
  }
  if cfg.seo.json_ld {
    let url = format!("{origin}{page_href}");
    let ld = serde_json::json!({
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": page.title,
      "url": url,
    });
    head_extras.push_str(&format!(
      "  <script type=\"application/ld+json\">{}</script>\n",
      crate::build::html::script_json(&ld.to_string())
    ));
  }
  format!(
    r##"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
{head_extras}  <link rel="stylesheet" href="{tokens}" />
  <link rel="stylesheet" href="{styles}" />
  <link rel="stylesheet" href="{shared}" />
  <link rel="stylesheet" href="{dock_css}" />
  <link rel="stylesheet" href="{mvp}" />
  <link rel="stylesheet" href="{prism}" />
  <link rel="stylesheet" href="{view_code}" />
  <script type="module" src="{app}"></script>
</head>
<body class="{body_class}">
  <header class="docs-header">
    <div class="header-inner">
      <a href="{home}" class="logo" aria-label="{site} home">
        <div class="logo-mark">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="header-logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#1ecf4e" />
                <stop offset="100%" stop-color="#80DBFF" />
              </linearGradient>
            </defs>
            <circle cx="12" cy="12" r="10" fill="url(#header-logo-gradient)" fill-opacity="0.12" stroke="url(#header-logo-gradient)" stroke-width="1.5"></circle>
            <path d="M9.38886 15.1629C9.89331 15.5 10.5955 15.5 12 15.5C13.4045 15.5 14.1067 15.5 14.6111 15.1629C14.8295 15.017 15.017 14.8295 15.1629 14.6111C15.5 14.1067 15.5 13.4045 15.5 12C15.5 10.5955 15.5 9.89331 15.1629 9.38886C15.017 9.17048 14.8295 8.98298 14.6111 8.83706C14.1067 8.5 13.4045 8.5 12 8.5C10.5955 8.5 9.89331 8.5 9.38886 8.83706C9.17048 8.98298 8.98298 9.17048 8.83706 9.38886C8.5 9.89331 8.5 10.5955 8.5 12C8.5 13.4045 8.5 14.1067 8.83706 14.6111C8.98298 14.8295 9.17048 15.017 9.38886 15.1629Z"
              fill="url(#header-logo-gradient)" fill-opacity="0.12" stroke="url(#header-logo-gradient)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
          </svg>
        </div>
        <span class="version">{site}</span>
      </a>
      <nav class="header-nav" aria-label="Primary">
        <a href="{home}" class="nav-link active">Docs</a>
      </nav>
    </div>
  </header>
  <div class="docs-container">
    <aside class="docs-sidebar-left">
      <nav class="sidebar-nav">
{sidebar}
      </nav>
    </aside>
    <main class="doc-main">
      <article class="doc-body page-content">
{body}
      </article>
    </main>
  </div>
</body>
</html>
"##,
    title = esc(&title),
    head_extras = head_extras,
    tokens = url("tokens/index.css"),
    styles = url("styles/index.css"),
    shared = url("styles/shared.css"),
    dock_css = url(&format!("docks/{dock}/index.css")),
    mvp = url("styles/mvp.css"),
    prism = url("views/code/prism.css"),
    view_code = url("views/code/index.css"),
    app = url("app.js"),
    home = home,
    body_class = body_class,
    site = esc(&cfg.seo.site_name),
    sidebar = sidebar,
    body = page.body_html,
  )
}

fn render_sidebar(cfg: &DocsConfig, active: &str) -> String {
  let base = cfg.site.base.as_str();
  // Every visible item with its route, in display order per section.
  let sections: Vec<(&SidebarSection, Vec<(&SidebarItem, String)>)> = cfg
    .sidebar
    .iter()
    .map(|section| {
      let mut items: Vec<&SidebarItem> = section.items.iter().filter(|i| !i.hide).collect();
      items.sort_by(|a, b| match (a.order, b.order) {
        (Some(ao), Some(bo)) => ao.cmp(&bo),
        (Some(_), None) => std::cmp::Ordering::Less,
        (None, Some(_)) => std::cmp::Ordering::Greater,
        (None, None) => a.path.cmp(&b.path),
      });
      let items = items.into_iter().map(|i| (i, item_route(i, cfg))).collect();
      (section, items)
    })
    .collect();
  // The active link is the longest route equal to or containing the page.
  let best = sections
    .iter()
    .flat_map(|(_, items)| items.iter().map(|(_, r)| r))
    .filter(|r| {
      r.as_str() == active || (r.as_str() != "/" && active.starts_with(&format!("{r}/")))
    })
    .max_by_key(|r| r.len())
    .cloned();

  let mut out = String::new();
  for (i, (section, items)) in sections.iter().enumerate() {
    if i > 0 {
      out.push_str("        <div class=\"sidebar-divider\"></div>\n");
    }
    let section_id = esc(&section.id);
    out.push_str(&format!(
      "        <details class=\"sidebar-group\" id=\"sidebar-{section_id}\" open>\n"
    ));
    out.push_str("          <summary class=\"sidebar-group-header\">\n");
    out.push_str(&format!("            <h3>{}</h3>\n", esc(&section.title)));
    out.push_str("          </summary>\n");
    out.push_str("          <div class=\"sidebar-group-links\">\n");
    for (item, route) in items {
      let label = item
        .label
        .clone()
        .unwrap_or_else(|| fallback_label(&item.path));
      let class = if best.as_deref() == Some(route.as_str()) {
        " class=\"active\""
      } else {
        ""
      };
      out.push_str(&format!(
        "            <a href=\"{href}\"{class}>{label}</a>\n",
        href = esc(&route_href(route, base)),
        class = class,
        label = esc(&label),
      ));
    }
    out.push_str("          </div>\n");
    out.push_str("        </details>\n");
  }
  out
}

/// Route of a sidebar item: the docs home is `entry.route`, a section's
/// `index.md` is the section (`x/index.md` → `<base>/x`).
fn item_route(item: &SidebarItem, cfg: &DocsConfig) -> String {
  let path = item.path.replace('\\', "/");
  if path == cfg.entry.home.replace('\\', "/") {
    return cfg.entry.route.clone();
  }
  let p = transform::section_route(path.trim_end_matches(".md"));
  if p.is_empty() {
    return transform::base_home(&cfg.site.base);
  }
  format!("{}/{}", cfg.site.base, p)
}

fn fallback_label(path: &str) -> String {
  Path::new(path)
    .file_stem()
    .and_then(|s| s.to_str())
    .unwrap_or(path)
    .to_string()
}

fn redirect_html(to: &str, title: &str, body: &str) -> String {
  format!(
    r#"<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta http-equiv="refresh" content="0;url={to}" />
<link rel="canonical" href="{to}" />
<script>location.replace({to_js});</script>
<title>{title}</title>
</head><body><p><a href="{to}">{body}</a></p></body></html>
"#,
    to = esc(to),
    to_js = serde_json::to_string(to).unwrap_or_else(|_| "\"/\"".into()),
    title = esc(title),
    body = esc(body),
  )
}

/// `[[redirect]]` stubs. `from` is a route under `site.base`; `to` is written
/// as given.
fn emit_redirects(out: &Path, cfg: &DocsConfig) -> Result<(), String> {
  for redir in &cfg.redirect {
    let Some(dir) = route_dir(out, &redir.from, &cfg.site.base).filter(|d| d != out) else {
      anza_logs::warn!(
        "skip redirect {} → {}: not a page under site.base {:?}",
        redir.from,
        redir.to,
        cfg.site.base
      );
      continue;
    };
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let html = redirect_html(&redir.to, "Redirect", &format!("Redirecting to {}…", redir.to));
    fs::write(dir.join("index.html"), html).map_err(|e| e.to_string())?;
  }
  Ok(())
}

/// The out dir's `index.html`: the docs home when `entry.route` is the base
/// (written by [`emit_page`]), else a redirect to it.
fn emit_root_index(out: &Path, cfg: &DocsConfig) -> Result<(), String> {
  if out.join("index.html").is_file() {
    return Ok(());
  }
  let to = route_href(&cfg.entry.route, &cfg.site.base);
  fs::write(out.join("index.html"), redirect_html(&to, &cfg.site.title, "Open docs"))
    .map_err(|e| e.to_string())
}

fn emit_landing(out: &Path, docs_root: &Path, cfg: &DocsConfig) -> Result<(), String> {
  let dir = out.join("home");
  fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
  if !cfg.assets.landing.is_empty() {
    let landing_src = resolve_asset_path(docs_root, &cfg.assets.landing);
    let index = landing_src.join("index.html");
    if index.is_file() {
      fs::copy(&index, dir.join("index.html")).map_err(|e| e.to_string())?;
      return Ok(());
    }
    anza_logs::warn!("assets.landing has no index.html at {}", index.display());
  }
  // Stub landing at <base>/home/.
  let base = cfg.site.base.as_str();
  let html = format!(
    r#"<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{site}</title>
<link rel="stylesheet" href="{tokens}" />
<link rel="stylesheet" href="{styles}" />
<link rel="stylesheet" href="{mvp}" />
</head>
<body class="docs-mvp" style="padding:3rem 1.5rem;max-width:40rem;margin:0 auto;">
  <h1>{site}</h1>
  <p>Docs generator MVP landing (stub). Full <code>pages/entry</code> marketing template comes later.</p>
  <p><a href="{home}">Open documentation</a></p>
</body></html>
"#,
    site = esc(&cfg.seo.site_name),
    tokens = esc(&asset_url(base, "tokens/index.css")),
    styles = esc(&asset_url(base, "styles/index.css")),
    mvp = esc(&asset_url(base, "styles/mvp.css")),
    home = esc(&route_href(&cfg.entry.route, base)),
  );
  fs::write(dir.join("index.html"), html).map_err(|e| e.to_string())
}

fn resolve_asset_path(docs_root: &Path, configured: &str) -> PathBuf {
  let path = PathBuf::from(configured);
  if path.is_absolute() {
    path
  } else {
    docs_root.join(path)
  }
}

fn emit_seo_files(out: &Path, cfg: &DocsConfig, pages: &[Page]) -> Result<(), String> {
  let origin = cfg.seo.origin.trim_end_matches('/');
  let base = cfg.site.base.as_str();
  if cfg.seo.robots {
    let mut robots = String::from("User-agent: *\nAllow: /\n");
    if !origin.is_empty() && cfg.seo.sitemap {
      robots.push_str(&format!("Sitemap: {origin}{}\n", asset_url(base, "sitemap.xml")));
    }
    fs::write(out.join("robots.txt"), robots).map_err(|e| e.to_string())?;
  }
  if cfg.seo.sitemap && !origin.is_empty() {
    let mut xml = String::from(
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n",
    );
    for page in pages {
      xml.push_str(&format!(
        "  <url><loc>{}{}</loc></url>\n",
        origin,
        esc(&route_href(&page.route, base))
      ));
    }
    xml.push_str("</urlset>\n");
    fs::write(out.join("sitemap.xml"), xml).map_err(|e| e.to_string())?;
  }
  Ok(())
}

fn esc(s: &str) -> String {
  s.replace('&', "&amp;")
    .replace('<', "&lt;")
    .replace('>', "&gt;")
    .replace('"', "&quot;")
}

#[cfg(test)]
mod site_tests {
  use super::*;

  fn put(root: &Path, rel: &str, body: &str) {
    let p = root.join(rel);
    fs::create_dir_all(p.parent().unwrap()).unwrap();
    fs::write(p, body).unwrap();
  }

  /// Every `href="…"` / `src="…"` / CSS `url(…)` value in `text`.
  fn urls(text: &str) -> Vec<String> {
    let mut found = Vec::new();
    for open in ["href=\"", "src=\"", "url('", "url(\""] {
      let mut rest = text;
      while let Some(i) = rest.find(open) {
        rest = &rest[i + open.len()..];
        let end = rest.find(['"', '\'']).unwrap();
        found.push(rest[..end].to_string());
        rest = &rest[end..];
      }
    }
    found
  }

  fn site(base: &str, tag: &str) -> (PathBuf, PathBuf) {
    let root = std::env::temp_dir().join(format!("anza-docs-site-{}-{tag}", std::process::id()));
    let _ = fs::remove_dir_all(&root);
    let theme = root.join("theme");
    put(&theme, "styles/index.css", "body{}\n");
    put(&theme, "styles/shared.css", ".a{background:url(\"/styles/x.png\")}\n");
    put(&theme, "styles/x.png", "");
    put(
      &theme,
      "tokens/index.css",
      "@font-face{src:url('/tokens/fonts/a.woff2') format('woff2'),url(//cdn.example/b.woff2),url(https://example.com/c.woff2),url(rel.woff2)}\n",
    );
    put(&theme, "tokens/fonts/a.woff2", "");
    put(&theme, "views/code/prism.js", "");
    put(&theme, "views/code/prism.css", "");
    put(&theme, "views/code/index.css", "");
    put(&theme, "docks/docs/index.css", "");
    let docs = root.join("docs");
    let route = if base.trim_matches('/').is_empty() { "/".to_string() } else { base.trim_end_matches('/').to_string() };
    put(
      &docs,
      "config.toml",
      &format!(
        "[site]\ntitle = \"Eng\"\nbase = \"{base}\"\n[entry]\nroute = \"{route}\"\nroot_dock = \"docs\"\n[assets]\nstyles = \"../theme/styles\"\ntokens = \"../theme/tokens\"\nview_code = \"../theme/views/code\"\ndocks = \"../theme/docks\"\nfavicon = \"../logo.svg\"\n[seo]\norigin = \"https://example.org\"\nsitemap = true\n[[redirect]]\nfrom = \"{prefix}/old\"\nto = \"{prefix}/x/\"\n",
        prefix = route.trim_end_matches('/'),
      ),
    );
    put(&root, "logo.svg", "<svg/>");
    put(
      &docs,
      "index.md",
      "# Home\n\nSee [x](x/index.md), [page](x/page.md#setup-steps), [ext](https://example.com/a.md), [root](/a.md).\n",
    );
    put(&docs, "x/index.md", "---\ntitle: Ex\n---\n# Ex\n\n## Getting started\n");
    put(&docs, "x/page.md", "# Page\n\n## Setup steps\n\n[up](index.md) [home](../index.md)\n");
    let out = root.join("out");
    run(&DocsOptions { config: docs.join("config.toml"), out: Some(out.clone()), sidebar_only: false }).unwrap();
    (root, out)
  }

  #[test]
  fn standalone_site_is_served_under_base() {
    let (root, out) = site("/eng/", "eng");
    let mut checked = 0;
    for entry in WalkDir::new(&out).into_iter().filter_map(|e| e.ok()) {
      let path = entry.path();
      let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
      if !matches!(ext, "html" | "css") {
        continue;
      }
      let text = fs::read_to_string(path).unwrap();
      for url in urls(&text) {
        let ok = url.starts_with("/eng/")
          || url == "/eng"
          || url == "/a.md" // written as a site-root link in the markdown
          || url.starts_with('#')
          || url.starts_with("//")
          || url.starts_with("https://")
          || (!url.starts_with('/') && !url.contains(':'));
        assert!(ok, "{}: {url}", path.display());
        if url.starts_with("/eng/") && url.rsplit('/').next().map_or(false, |f| f.contains('.')) {
          let file = out.join(url.trim_start_matches("/eng/"));
          assert!(file.is_file(), "{}: {url} missing", path.display());
        }
        checked += 1;
      }
    }
    assert!(checked > 20, "{checked}");

    // Layout: the out dir is what is served at /eng/.
    let home = fs::read_to_string(out.join("index.html")).unwrap();
    for f in ["x/index.html", "x/page/index.html", "old/index.html", "favicon.svg", "app.js", "sitemap.xml"] {
      assert!(out.join(f).is_file(), "{f}");
    }
    assert!(!out.join("x/index/index.html").exists());
    assert!(!out.join("docs").exists());
    assert!(!out.join("eng").exists());

    // Section index pages are the section; absolute URLs stay; headings have ids.
    assert!(home.contains("<a href=\"/eng/x\">x</a>"), "{home}");
    assert!(home.contains("href=\"/eng/x/page#setup-steps\""), "{home}");
    assert!(home.contains("href=\"https://example.com/a.md\""), "{home}");
    assert!(home.contains("href=\"/a.md\""), "{home}");
    assert!(home.contains("<a href=\"/eng/x\">Overview</a>"), "{home}");
    assert!(!home.contains("/eng/x/index"), "{home}");
    assert!(home.contains("<h1 id=\"home\">Home</h1>"), "{home}");
    assert!(home.contains("<link rel=\"icon\" href=\"/eng/favicon.svg\" type=\"image/svg+xml\" />"), "{home}");
    assert!(home.contains("<link rel=\"canonical\" href=\"https://example.org/eng/\" />"), "{home}");
    let page = fs::read_to_string(out.join("x/page/index.html")).unwrap();
    assert!(page.contains("<h2 id=\"setup-steps\">Setup steps</h2>"), "{page}");
    assert!(page.contains("<a href=\"/eng/x/page\" class=\"active\">"), "{page}");
    assert!(page.contains("href=\"/eng/x\">up</a> <a href=\"/eng\">home</a>"), "{page}");
    let section = fs::read_to_string(out.join("x/index.html")).unwrap();
    assert!(section.contains("<h2 id=\"getting-started\">"), "{section}");
    assert!(section.contains("<a href=\"/eng/x\" class=\"active\">Overview</a>"), "{section}");
    assert!(section.contains("<link rel=\"canonical\" href=\"https://example.org/eng/x\" />"), "{section}");
    let old = fs::read_to_string(out.join("old/index.html")).unwrap();
    assert!(old.contains("url=/eng/x/"), "{old}");

    let tokens = fs::read_to_string(out.join("tokens/index.css")).unwrap();
    assert_eq!(
      tokens,
      "@font-face{src:url('/eng/tokens/fonts/a.woff2') format('woff2'),url(//cdn.example/b.woff2),url(https://example.com/c.woff2),url(rel.woff2)}\n"
    );
    let app = fs::read_to_string(out.join("app.js")).unwrap();
    assert!(app.contains("const BASE = \"/eng\";"), "{app}");
    assert!(!app.contains("/docs"), "{app}");
    let sitemap = fs::read_to_string(out.join("sitemap.xml")).unwrap();
    assert!(sitemap.contains("<loc>https://example.org/eng/x/page</loc>"), "{sitemap}");
    let _ = fs::remove_dir_all(&root);
  }

  #[test]
  fn empty_base_serves_at_the_domain_root() {
    let (root, out) = site("/", "root");
    let home = fs::read_to_string(out.join("index.html")).unwrap();
    assert!(home.contains("href=\"/tokens/index.css\""), "{home}");
    assert!(home.contains("<script type=\"module\" src=\"/app.js\">"), "{home}");
    assert!(home.contains("<a href=\"/x\">Overview</a>"), "{home}");
    assert!(out.join("x/page/index.html").is_file());
    assert!(out.join("old/index.html").is_file());
    let tokens = fs::read_to_string(out.join("tokens/index.css")).unwrap();
    assert!(tokens.contains("url('/tokens/fonts/a.woff2')"), "{tokens}");
    assert!(fs::read_to_string(out.join("app.js")).unwrap().contains("const BASE = \"\";"));
    let _ = fs::remove_dir_all(&root);
  }
}
