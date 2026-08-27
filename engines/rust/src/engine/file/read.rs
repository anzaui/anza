use {
  crate::errors::{Error, Result},
  std::{fs::File, path::Path},
};

pub fn text(path: &Path) -> Result<String> {
  std::fs::read_to_string(path).map_err(|e| Error::not_found(format!("Failed to read {}: {}", path.display(), e)))
}

pub fn mmap(path: &Path) -> Result<memmap2::Mmap> {
  let file = File::open(path).map_err(|e| Error::not_found(format!("Failed to open {}: {}", path.display(), e)))?;
  unsafe {
    memmap2::Mmap::map(&file).map_err(|e| Error::internal(format!("Failed to mmap {}: {}", path.display(), e)))
  }
}
