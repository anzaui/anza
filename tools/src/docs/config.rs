use std::fs;
use std::path::Path;

use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct DocsConfig {
  pub site: Site,
  pub entry: Entry,
  #[serde(default)]
  pub files: Files,
  pub assets: Assets,
  #[serde(default)]
  pub seo: Seo,
  #[serde(default, rename = "sidebar")]
  pub sidebar: Vec<SidebarSection>,
  #[serde(default, rename = "redirect")]
  pub redirect: Vec<Redirect>,
  #[serde(default)]
  pub pages: Pages,
}

/// `anza docs --pages`: markdown → Anza page folders inside an app
/// (fragment `index.html` + `page()` module per file, plus section barrels).
#[derive(Debug, Deserialize)]
pub struct Pages {
  /// Output folder, relative to the docs root (default `../web/src/docs`).
  #[serde(default = "default_pages_out")]
  pub out: String,
  /// Hand-written files copied over the generated tree (relative to the docs
  /// root; skipped when missing). Never read as markdown.
  #[serde(default = "default_pages_overlay")]
  pub overlay: String,
  /// Folder name of the docs home page (`entry.home`).
  #[serde(default = "default_pages_home")]
  pub home: String,
  /// Stylesheets every generated page declares.
  #[serde(default = "default_pages_style")]
  pub style: Vec<String>,
}

impl Default for Pages {
  fn default() -> Self {
    Pages {
      out: default_pages_out(),
      overlay: default_pages_overlay(),
      home: default_pages_home(),
      style: default_pages_style(),
    }
  }
}

fn default_pages_out() -> String {
  "../web/src/docs".into()
}
fn default_pages_overlay() -> String {
  "_app".into()
}
fn default_pages_home() -> String {
  "entry".into()
}
fn default_pages_style() -> Vec<String> {
  vec!["/styles/shared.css".into()]
}

#[derive(Debug, Deserialize)]
pub struct Site {
  #[serde(default = "default_title")]
  pub title: String,
  #[serde(default = "default_base")]
  pub base: String,
  #[serde(default = "default_out")]
  pub out: String,
}

fn default_title() -> String {
  "Documentation".into()
}
fn default_base() -> String {
  "/docs".into()
}
fn default_out() -> String {
  "dist".into()
}

#[derive(Debug, Deserialize)]
pub struct Entry {
  #[serde(default = "default_home")]
  pub home: String,
  #[serde(default = "default_base")]
  pub route: String,
  #[serde(default)]
  pub landing: bool,
  #[serde(default)]
  pub shell: String,
  #[serde(default = "default_root_dock")]
  pub root_dock: String,
  #[serde(default = "default_via")]
  pub via: Vec<String>,
}

fn default_home() -> String {
  "index.md".into()
}
fn default_root_dock() -> String {
  "main".into()
}
fn default_via() -> Vec<String> {
  vec![
    "main".into(),
    "docs".into(),
    "content".into(),
  ]
}

#[derive(Debug, Deserialize, Default)]
pub struct Files {
  #[serde(default)]
  pub roots: Vec<String>,
  #[serde(default)]
  pub include: Vec<String>,
  #[serde(default)]
  pub exclude: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct Assets {
  /// Optional pack root containing styles/, tokens/, views/, images/, docks/, …
  #[serde(default)]
  pub pack: String,
  /// Whole styles/ directory → dist/styles/ (site-root `/styles/...`).
  #[serde(default = "default_styles")]
  pub styles: String,
  /// Design tokens directory → dist/tokens/.
  #[serde(default = "default_tokens")]
  pub tokens: String,
  /// view-code folder → dist/views/code/.
  #[serde(default = "default_view_code")]
  pub view_code: String,
  /// Optional images (or media) folder → dist/images/.
  #[serde(default)]
  pub images: String,
  /// Docks chrome folder → dist/docks/.
  #[serde(default = "default_docks")]
  pub docks: String,
  /// Optional landing page folder (template).
  #[serde(default)]
  pub landing: String,
}

fn default_styles() -> String {
  "../web/src/styles".into()
}
fn default_tokens() -> String {
  "../web/src/tokens".into()
}
fn default_view_code() -> String {
  "../web/src/views/code".into()
}
fn default_docks() -> String {
  "../web/src/docks".into()
}

#[derive(Debug, Deserialize, Default)]
pub struct Seo {
  #[serde(default = "default_site_name")]
  pub site_name: String,
  #[serde(default)]
  pub origin: String,
  #[serde(default)]
  pub sitemap: bool,
  #[serde(default)]
  pub robots: bool,
  #[serde(default)]
  pub json_ld: bool,
}

fn default_site_name() -> String {
  "Anza".into()
}

#[derive(Debug, Deserialize)]
pub struct SidebarSection {
  pub id: String,
  pub title: String,
  #[serde(default)]
  pub items: Vec<SidebarItem>,
}

#[derive(Debug, Deserialize)]
pub struct SidebarItem {
  pub path: String,
  #[serde(default)]
  pub label: Option<String>,
  #[serde(default)]
  pub hide: bool,
  #[serde(default)]
  pub order: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct Redirect {
  pub from: String,
  pub to: String,
}

pub fn load_config(path: &Path) -> Result<DocsConfig, String> {
  let raw = fs::read_to_string(path).map_err(|e| format!("read {}: {e}", path.display()))?;
  // Support nested [[sidebar.section]] / [[sidebar.section.items]] via serde rename.
  // TOML crate maps sidebar.section → need #[serde(rename = "sidebar.section")] on a wrapper,
  // or flatten with a custom structure. Use intermediate Value + manual assemble if needed.
  toml::from_str::<DocsConfigToml>(&raw)
    .map_err(|e| format!("parse {}: {e}", path.display()))
    .map(Into::into)
}

/// Wire format matching docs/config.toml nesting.
#[derive(Debug, Deserialize)]
struct DocsConfigToml {
  site: Site,
  entry: Entry,
  #[serde(default)]
  files: Files,
  assets: Assets,
  #[serde(default)]
  seo: Seo,
  #[serde(default)]
  sidebar: SidebarToml,
  #[serde(default)]
  redirect: Vec<Redirect>,
  #[serde(default)]
  pages: Pages,
}

#[derive(Debug, Deserialize, Default)]
struct SidebarToml {
  #[serde(default)]
  section: Vec<SidebarSectionToml>,
}

#[derive(Debug, Deserialize)]
struct SidebarSectionToml {
  id: String,
  title: String,
  #[serde(default)]
  items: Vec<SidebarItem>,
}

impl From<DocsConfigToml> for DocsConfig {
  fn from(t: DocsConfigToml) -> Self {
    Self {
      site: t.site,
      entry: t.entry,
      files: t.files,
      assets: t.assets,
      seo: t.seo,
      sidebar: t
        .sidebar
        .section
        .into_iter()
        .map(|s| SidebarSection {
          id: s.id,
          title: s.title,
          items: s.items,
        })
        .collect(),
      redirect: t.redirect,
      pages: t.pages,
    }
  }
}
