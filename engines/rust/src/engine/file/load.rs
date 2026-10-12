use {
  crate::{
    crypto::digest,
    engine::slot::{bind::{self, Data, Params}, extract, Chunk},
    errors::{Error, Result},
  },
  serde::Serialize,
  std::{
    collections::HashMap,
    fs::File,
    io::Read,
    path::{Path, PathBuf},
  },
  walkdir::WalkDir,
};

/// Default cap on a template file's size: 1 MiB.
pub const DEFAULT_MAX_TEMPLATE_BYTES: usize = 1024 * 1024;

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
  /// Refuse template files larger than this many bytes.
  pub max_bytes: usize,
}

impl Default for LoadOptions {
  fn default() -> Self {
    Self {
      escape: false,
      max_bytes: DEFAULT_MAX_TEMPLATE_BYTES,
    }
  }
}

/// `rel_path` as a cache key: `/`-separated on every platform.
fn key(rel_path: &Path) -> String {
  rel_path
    .components()
    .map(|c| c.as_os_str().to_string_lossy())
    .collect::<Vec<_>>()
    .join("/")
}

/// Whether `path` (after resolving symlinks) is inside `root`.
pub(crate) fn inside(root: &Path, path: &Path) -> bool {
  match (std::fs::canonicalize(root), std::fs::canonicalize(path)) {
    (Ok(root), Ok(path)) => path.starts_with(root),
    _ => false,
  }
}

pub fn one(root: &Path, rel_path: &Path) -> Result<Template> {
  one_with(root, rel_path, &LoadOptions::default())
}

/// Load one template. Errors name the template, never the full path:
/// a file that resolves (through a symlink) outside `root`, or that is
/// larger than `max_bytes`, is refused.
pub fn one_with(root: &Path, rel_path: &Path, options: &LoadOptions) -> Result<Template> {
  let name = key(rel_path);
  let full_path = root.join(rel_path);
  if !inside(root, &full_path) {
    return Err(Error::not_found(format!("Template '{}' is outside the template root", name)));
  }
  let file = File::open(&full_path).map_err(|e| Error::not_found(format!("Failed to read template '{}': {}", name, e.kind())))?;
  let mut bytes = Vec::new();
  file
    .take(options.max_bytes as u64 + 1)
    .read_to_end(&mut bytes)
    .map_err(|e| Error::not_found(format!("Failed to read template '{}': {}", name, e.kind())))?;
  if bytes.len() > options.max_bytes {
    return Err(Error::template(format!("Template '{}' is larger than {} bytes", name, options.max_bytes)));
  }
  let raw = String::from_utf8(bytes).map_err(|_| Error::template(format!("Template '{}' is not valid UTF-8", name)))?;
  let digest = digest::content(raw.as_bytes());
  let chunks = extract(&raw)?;

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

/// Load every `.html` file under `root`. Symlinked directories are not
/// followed, and symlinked files that resolve outside `root` are skipped.
pub fn all_with(root: &Path, options: &LoadOptions) -> Result<HashMap<String, Template>> {
  let mut map = HashMap::new();
  if !root.exists() {
    return Ok(map);
  }

  for entry in WalkDir::new(root).into_iter().filter_map(|e| e.ok()) {
    let path = entry.path();
    if path.is_file() && path.extension().map_or(false, |ext| ext == "html") {
      if entry.path_is_symlink() && !inside(root, path) {
        continue;
      }
      if let Ok(rel) = path.strip_prefix(root) {
        let tpl = one_with(root, rel, options)?;
        map.insert(tpl.name.clone(), tpl);
      }
    }
  }

  Ok(map)
}
