use std::path::PathBuf;
use crate::docs::{self, DocsOptions};

#[derive(Debug, Clone)]
pub struct Docs {
  pub config: PathBuf,
  pub out: Option<PathBuf>,
  pub all: bool,
}

impl Docs {
  pub fn run(&self) -> Result<(), String> {
    let opts = DocsOptions {
      config: self.config.clone(),
      out: self.out.clone(),
      sidebar_only: !self.all,
    };
    docs::run(&opts)
  }
}
