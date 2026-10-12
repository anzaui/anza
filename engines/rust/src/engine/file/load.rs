use {
  super::read,
  crate::{
    crypto::blake,
    engine::slot::{bind::{self, Data, Params}, extract, Chunk},
    errors::Result,
  },
  serde::Serialize,
  std::{
    collections::HashMap,
    path::{Path, PathBuf},
  },
  walkdir::WalkDir,
};

#[derive(Debug, Clone)]
pub struct Template {
  pub name: String,
  pub path: PathBuf,
  pub raw: String,
  pub digest: [u8; 32],
  pub chunks: Vec<Chunk>,
  /// HTML-escape `{{slot}}` values (`Setup::escape`).
  pub escape: bool,
}

impl Template {
  /// Bind any parameter source (Value, tuples, arrays, slices, HashMaps, or () for empty)
  pub fn bind<P: Params + ?Sized>(&self, params: &P) -> Result<String> {
    bind::string_with(&self.chunks, params, self.escape)
  }

  /// Render directly from any struct implementing `serde::Serialize`
  pub fn render<T: Serialize>(&self, data: &T) -> Result<String> {
    bind::string_with(&self.chunks, &Data(data), self.escape)
  }
}

/// How templates are loaded (from `Setup`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct LoadOptions {
  /// HTML-escape `{{slot}}` values; `{{{raw}}}` stays raw.
  pub escape: bool,
}

impl Default for LoadOptions {
  fn default() -> Self {
    Self { escape: false }
  }
}

pub fn one(root: &Path, rel_path: &Path) -> Result<Template> {
  one_with(root, rel_path, &LoadOptions::default())
}

pub fn one_with(root: &Path, rel_path: &Path, options: &LoadOptions) -> Result<Template> {
  let full_path = root.join(rel_path);
  let raw = read::text(&full_path)?;
  let digest = blake::digest::content(raw.as_bytes());
  let chunks = extract(&raw)?;

  let name = rel_path
    .to_string_lossy()
    .trim_start_matches('/')
    .to_string();

  Ok(Template {
    name,
    path: full_path,
    raw,
    digest,
    chunks,
    escape: options.escape,
  })
}

pub fn all(root: &Path) -> Result<HashMap<String, Template>> {
  all_with(root, &LoadOptions::default())
}

pub fn all_with(root: &Path, options: &LoadOptions) -> Result<HashMap<String, Template>> {
  let mut map = HashMap::new();
  if !root.exists() {
    return Ok(map);
  }

  for entry in WalkDir::new(root).into_iter().filter_map(|e| e.ok()) {
    let path = entry.path();
    if path.is_file() && path.extension().map_or(false, |ext| ext == "html") {
      if let Ok(rel) = path.strip_prefix(root) {
        let tpl = one_with(root, rel, options)?;
        map.insert(tpl.name.clone(), tpl);
      }
    }
  }

  Ok(map)
}
