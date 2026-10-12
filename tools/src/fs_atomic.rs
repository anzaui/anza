// tools/src/fs_atomic.rs
//
// Atomic file writes for build output: write a temp file in the destination
// directory, then rename it over the target. Readers (the dev server, a
// browser, a parallel worker) see either the old file or the new one, never a
// truncated or half-written file.

use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};

static COUNTER: AtomicU64 = AtomicU64::new(0);

/// Atomically replace `path` with `bytes`, creating parent directories.
/// Errors name the path.
pub fn write(path: &Path, bytes: impl AsRef<[u8]>) -> Result<(), String> {
  let dir = path.parent().filter(|p| !p.as_os_str().is_empty()).unwrap_or(Path::new("."));
  std::fs::create_dir_all(dir).map_err(|e| format!("cannot create {}: {}", dir.display(), e))?;

  let tmp = temp_path(dir, path);
  let result = (|| {
    let mut file = std::fs::File::create(&tmp)?;
    file.write_all(bytes.as_ref())?;
    file.flush()?;
    drop(file);
    std::fs::rename(&tmp, path)
  })();
  if let Err(err) = result {
    let _ = std::fs::remove_file(&tmp);
    return Err(format!("cannot write {}: {}", path.display(), err));
  }
  Ok(())
}

/// Atomically copy `from` to `to` (read fully, then [`write`]).
pub fn copy(from: &Path, to: &Path) -> Result<(), String> {
  let bytes = std::fs::read(from).map_err(|e| format!("cannot read {}: {}", from.display(), e))?;
  write(to, bytes)
}

/// Write only when the content differs from what is on disk. Returns whether
/// the file was written. Keeps mtimes stable so file watchers stay quiet.
pub fn write_if_changed(path: &Path, bytes: impl AsRef<[u8]>) -> Result<bool, String> {
  let bytes = bytes.as_ref();
  if let Ok(current) = std::fs::read(path) {
    if current == bytes {
      return Ok(false);
    }
  }
  write(path, bytes)?;
  Ok(true)
}

/// Hidden temp name in the same directory (same filesystem, so rename is atomic).
fn temp_path(dir: &Path, target: &Path) -> PathBuf {
  let name = target
    .file_name()
    .map(|n| n.to_string_lossy().into_owned())
    .unwrap_or_default();
  let n = COUNTER.fetch_add(1, Ordering::Relaxed);
  dir.join(format!(".{}.{}-{}.tmp", name, std::process::id(), n))
}

#[cfg(test)]
mod tests {
  use super::*;

  fn temp_dir(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!("anza-fs-atomic-{}-{}", name, std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    dir
  }

  #[test]
  fn writes_and_replaces_without_leftovers() {
    let dir = temp_dir("replace");
    let path = dir.join("a/b/index.html");
    write(&path, "one").unwrap();
    write(&path, "two").unwrap();
    assert_eq!(std::fs::read_to_string(&path).unwrap(), "two");
    let names: Vec<_> = std::fs::read_dir(path.parent().unwrap())
      .unwrap()
      .map(|e| e.unwrap().file_name())
      .collect();
    assert_eq!(names, vec![std::ffi::OsString::from("index.html")]);
    let _ = std::fs::remove_dir_all(&dir);
  }

  #[test]
  fn write_if_changed_skips_identical_content() {
    let dir = temp_dir("changed");
    let path = dir.join("x.json");
    assert!(write_if_changed(&path, "{}").unwrap());
    assert!(!write_if_changed(&path, "{}").unwrap());
    assert!(write_if_changed(&path, "[]").unwrap());
    let _ = std::fs::remove_dir_all(&dir);
  }

  #[test]
  fn failure_names_the_path() {
    let dir = temp_dir("fail");
    std::fs::create_dir_all(&dir).unwrap();
    std::fs::write(dir.join("file"), "x").unwrap();
    let err = write(&dir.join("file/below"), "y").unwrap_err();
    assert!(err.contains("file"), "{err}");
    let _ = std::fs::remove_dir_all(&dir);
  }
}
