use std::fs;
use std::io::Write;
use std::path::PathBuf;

pub fn write(path: PathBuf, content: &str) {
  if let Some(parent) = path.parent() {
    let _ = fs::create_dir_all(parent);
  }
  let mut file = fs::File::create(&path).unwrap_or_else(|e| {
    anza_logs::error!("Failed to create {}: {}", path.display(), e);
    std::process::exit(1);
  });
  file.write_all(content.as_bytes()).unwrap_or_else(|e| {
    anza_logs::error!("Failed to write {}: {}", path.display(), e);
    std::process::exit(1);
  });
}
