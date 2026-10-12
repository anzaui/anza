// tools/src/build/cache.rs
//
// Incremental-build cache: hashes of files seen in the last run so unchanged
// files can be skipped during the copy phase.

use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

/// Cache file for incremental rebuilds.
pub const FILE: &str = ".anzacache.json";

#[derive(Debug, Serialize, Deserialize)]
pub struct Cache {
  pub version: String,
  pub dev: bool,
  /// Hash of import map, structure slots and deploy base (see graph::config_key).
  #[serde(default)]
  pub config: String,
  pub hashes: BTreeMap<PathBuf, String>,
  /// `(mtime ns, size)` of each hashed file: when unchanged, the stored hash
  /// is reused without reading the file.
  #[serde(default)]
  pub stats: BTreeMap<PathBuf, Stat>,
  pub timestamp: u64,
}

/// File modification time (ns since the epoch) and size.
pub type Stat = (u64, u64);

/// `(mtime ns, size)` of `path`.
pub fn stat(path: &Path) -> Option<Stat> {
  let meta = std::fs::metadata(path).ok()?;
  let mtime = meta
    .modified()
    .ok()?
    .duration_since(std::time::UNIX_EPOCH)
    .ok()?
    .as_nanos() as u64;
  Some((mtime, meta.len()))
}

/// Hash of `path`, reusing the hash in `prior` when the file's mtime and size
/// match what was recorded with it. Returns the hash and the current stat.
pub fn hash_cached(path: &Path, prior: Option<&Cache>) -> Option<(String, Stat)> {
  let now = stat(path)?;
  if let Some(cache) = prior {
    if cache.stats.get(path) == Some(&now) {
      if let Some(hash) = cache.hashes.get(path) {
        return Some((hash.clone(), now));
      }
    }
  }
  Some((hash(path)?, now))
}

/// Compute a simple hash of a file's contents for cache invalidation.
pub fn hash(path: &Path) -> Option<String> {
  use std::collections::hash_map::DefaultHasher;
  use std::hash::{Hash, Hasher};

  let content = std::fs::read(path).ok()?;
  let mut hasher = DefaultHasher::new();
  content.hash(&mut hasher);
  Some(format!("{:x}", hasher.finish()))
}

/// Load the build cache from disk.
pub fn load(project: &Path) -> Option<Cache> {
  let path = project.join(FILE);
  let text = std::fs::read_to_string(&path).ok()?;
  serde_json::from_str(&text).ok()
}

/// Save the build cache to disk.
pub fn save(project: &Path, cache: &Cache) {
  let path = project.join(FILE);
  if let Ok(json) = serde_json::to_string_pretty(cache) {
    if let Err(err) = crate::fs_atomic::write(&path, json) {
      anza_logs::warn!("{}", err);
    }
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn hash_cached_reuses_only_while_mtime_and_size_match() {
    let dir = std::env::temp_dir().join(format!("anza-cache-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    let file = dir.join("a.css");
    std::fs::write(&file, "a{}").unwrap();
    let (real, st) = hash_cached(&file, None).unwrap();

    let mut cache = Cache {
      version: String::new(),
      dev: true,
      config: String::new(),
      hashes: BTreeMap::from([(file.clone(), "stored".to_string())]),
      stats: BTreeMap::from([(file.clone(), st)]),
      timestamp: 0,
    };
    // Same stat: the stored hash is trusted without reading the file.
    assert_eq!(hash_cached(&file, Some(&cache)).unwrap().0, "stored");
    // Different size: rehash.
    std::fs::write(&file, "a{color:red}").unwrap();
    assert_ne!(hash_cached(&file, Some(&cache)).unwrap().0, "stored");
    // No stat recorded (old cache file): rehash.
    cache.stats.clear();
    std::fs::write(&file, "a{}").unwrap();
    assert_eq!(hash_cached(&file, Some(&cache)).unwrap().0, real);
    let _ = std::fs::remove_dir_all(&dir);
  }
}
