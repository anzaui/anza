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
}

impl Template {
  /// Bind any parameter source (Value, tuples, arrays, slices, HashMaps, or () for empty)
  pub fn bind<P: Params + ?Sized>(&self, params: &P) -> Result<String> {
    bind::string(&self.chunks, params)
  }

  /// Render directly from any struct implementing `serde::Serialize`
  pub fn render<T: Serialize>(&self, data: &T) -> Result<String> {
    bind::string(&self.chunks, &Data(data))
  }
}

pub fn one(root: &Path, rel_path: &Path) -> Result<Template> {
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
  })
}

pub fn all(root: &Path) -> Result<HashMap<String, Template>> {
  let mut map = HashMap::new();
  if !root.exists() {
    return Ok(map);
  }

  for entry in WalkDir::new(root).into_iter().filter_map(|e| e.ok()) {
    let path = entry.path();
    if path.is_file() && path.extension().map_or(false, |ext| ext == "html") {
      if let Ok(rel) = path.strip_prefix(root) {
        let tpl = one(root, rel)?;
        map.insert(tpl.name.clone(), tpl);
      }
    }
  }

  Ok(map)
}
