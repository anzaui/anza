use std::path::PathBuf;
use crate::extract;

#[derive(Debug, Clone, Default)]
pub struct Build {
  pub src: PathBuf,
  pub dist: PathBuf,
  pub entries: Vec<PathBuf>,
  pub strict: bool,
}

impl Build {
  pub fn validate(&self) -> Result<(), String> {
    if !self.src.exists() {
      return Err(format!("source path does not exist: {}", self.src.display()));
    }
    Ok(())
  }

  pub fn run(&self) -> Result<(), String> {
    self.validate()?;
    extract::compile(&self.src, &self.dist, self.strict, &self.entries);
    Ok(())
  }
}
