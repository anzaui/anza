use std::path::PathBuf;
use crate::create;

#[derive(Debug, Clone)]
pub struct Create {
  pub target: PathBuf,
  pub name: String,
}

impl Create {
  pub fn validate(&self) -> Result<(), String> {
    if self.name.trim().is_empty() {
      return Err("project name must not be empty".into());
    }
    Ok(())
  }

  pub fn run(&self) -> Result<(), String> {
    self.validate()?;
    create::run(&self.target, &self.name);
    Ok(())
  }
}
