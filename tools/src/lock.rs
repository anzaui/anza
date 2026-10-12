// tools/src/lock.rs
//
// Project lock so `anza build` and `anza dev` never work on the same dist and
// build cache at once (a build wipes dist under the running dev server and
// both share .anzacache.json). The lock file lives beside the build cache.

use std::io::Write;
use std::path::{Path, PathBuf};

/// Lock file name, created in the project directory (parent of src).
pub const FILE: &str = ".anza.lock";

/// Held for as long as the value lives; the file is removed on drop.
#[derive(Debug)]
pub struct Lock {
  path: PathBuf,
}

/// Project directory for a source dir (same rule as the build cache).
pub fn project_dir(src: &Path) -> PathBuf {
  match src.parent() {
    Some(p) if !p.as_os_str().is_empty() => p.to_path_buf(),
    _ => PathBuf::from("."),
  }
}

impl Lock {
  /// Take the project lock for `command` (e.g. "build", "dev"). Fails when
  /// another live anza process holds it; a stale lock is taken over.
  pub fn acquire(project: &Path, command: &str) -> Result<Lock, String> {
    let path = project.join(FILE);
    for _ in 0..2 {
      match std::fs::OpenOptions::new().write(true).create_new(true).open(&path) {
        Ok(mut file) => {
          let _ = writeln!(file, "{} {}", std::process::id(), command);
          return Ok(Lock { path });
        }
        Err(err) if err.kind() == std::io::ErrorKind::AlreadyExists => {
          let holder = std::fs::read_to_string(&path).unwrap_or_default();
          let mut parts = holder.split_whitespace();
          let pid = parts.next().and_then(|p| p.parse::<u32>().ok());
          let other = parts.next().unwrap_or("?").to_string();
          match pid {
            Some(pid) if is_alive(pid) => {
              return Err(format!(
                "another `anza {}` (pid {}) is using this project; stop it first, \
                 or delete {} if no anza process is running",
                other,
                pid,
                path.display()
              ));
            }
            // Stale lock (process gone or unreadable): take it over.
            _ => {
              let _ = std::fs::remove_file(&path);
            }
          }
        }
        Err(err) => return Err(format!("cannot create {}: {}", path.display(), err)),
      }
    }
    Err(format!("cannot take the project lock {}", path.display()))
  }
}

impl Drop for Lock {
  fn drop(&mut self) {
    let _ = std::fs::remove_file(&self.path);
  }
}

#[cfg(target_os = "linux")]
fn is_alive(pid: u32) -> bool {
  Path::new(&format!("/proc/{}", pid)).exists()
}

/// Without a portable liveness check, assume the holder is alive; the error
/// message tells the user how to clear a stale lock.
#[cfg(not(target_os = "linux"))]
fn is_alive(_pid: u32) -> bool {
  true
}

#[cfg(test)]
mod tests {
  use super::*;

  fn dir(name: &str) -> PathBuf {
    let d = std::env::temp_dir().join(format!("anza-lock-{}-{}", name, std::process::id()));
    let _ = std::fs::remove_dir_all(&d);
    std::fs::create_dir_all(&d).unwrap();
    d
  }

  #[test]
  fn second_holder_is_refused_until_release() {
    let d = dir("held");
    let first = Lock::acquire(&d, "dev").unwrap();
    let err = Lock::acquire(&d, "build").unwrap_err();
    assert!(err.contains("anza dev"), "{err}");
    drop(first);
    assert!(!d.join(FILE).exists());
    Lock::acquire(&d, "build").unwrap();
    let _ = std::fs::remove_dir_all(&d);
  }

  #[cfg(target_os = "linux")]
  #[test]
  fn stale_lock_is_taken_over() {
    let d = dir("stale");
    std::fs::write(d.join(FILE), "4294967295 dev\n").unwrap();
    Lock::acquire(&d, "build").unwrap();
    let _ = std::fs::remove_dir_all(&d);
  }

  #[test]
  fn project_dir_of_bare_src_is_cwd() {
    assert_eq!(project_dir(Path::new("src")), PathBuf::from("."));
    assert_eq!(project_dir(Path::new("/a/web/src")), PathBuf::from("/a/web"));
  }
}
