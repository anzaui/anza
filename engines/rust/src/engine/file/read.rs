use {
  crate::errors::{Error, Result},
  std::{fs::File, path::Path},
};

/// Read a template file. The error names only the file name, never the
/// full path.
pub fn text(path: &Path) -> Result<String> {
  std::fs::read_to_string(path).map_err(|e| Error::not_found(format!("Failed to read template {}: {}", display_name(path), e.kind())))
}

fn display_name(path: &Path) -> String {
  path.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default()
}

pub fn mmap(path: &Path) -> Result<memmap2::Mmap> {
  let file = File::open(path).map_err(|e| Error::not_found(format!("Failed to open {}: {}", display_name(path), e.kind())))?;
  unsafe { memmap2::Mmap::map(&file).map_err(|e| Error::internal(format!("Failed to mmap {}: {}", display_name(path), e.kind()))) }
}
