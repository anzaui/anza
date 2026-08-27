use std::fs;
use std::path::PathBuf;

pub fn find() -> Option<PathBuf> {
  let mut candidates: Vec<PathBuf> = Vec::new();

  if let Ok(exe) = std::env::current_exe() {
    if let Some(dir) = exe.parent() {
      candidates.push(dir.to_path_buf());
    }
  }

  if let Ok(cwd) = std::env::current_dir() {
    candidates.push(cwd);
  }

  for mut current in candidates {
    loop {
      let node = current.join("node_modules").join("@anzaui").join("anza");
      if node.exists() {
        return Some(node);
      }
      let local = current.join("library");
      if local.exists() {
        return Some(local);
      }
      if let Ok(text) = fs::read_to_string(current.join("package.json")) {
        if text.contains(r#""name": "@anzaui/anza""#) {
          return Some(current);
        }
      }
      if let Some(parent) = current.parent() {
        current = parent.to_path_buf();
      } else {
        break;
      }
    }
  }

  None
}
