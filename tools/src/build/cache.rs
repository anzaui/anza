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
  pub timestamp: u64,
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
