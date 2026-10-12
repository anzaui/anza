use std::path::PathBuf;
use crate::extract;

#[derive(Debug, Clone, Default)]
pub struct Build {
  pub src: PathBuf,
  pub dist: PathBuf,
  pub entries: Vec<PathBuf>,
  pub strict: bool,
  /// Type declarations output (default: `types/` beside dist).
  pub types: Option<PathBuf>,
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
    let _lock = crate::lock::Lock::acquire(&crate::lock::project_dir(&self.src), "build")?;
    let types = self
      .types
      .clone()
      .unwrap_or_else(|| extract::default_types_dir(&self.dist));
    extract::compile_into(&self.src, &self.dist, &types, self.strict, &self.entries).map_err(|errors| {
      extract::report_errors(&errors);
      format!("Build failed: {} error(s)", errors.len())
    })
  }
}
