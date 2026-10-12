use std::path::PathBuf;
use crate::docs::{self, DocsOptions};

#[derive(Debug, Clone)]
pub struct Docs {
  pub config: PathBuf,
  pub out: Option<PathBuf>,
  pub all: bool,
  /// Generate Anza page folders (`[pages]` in config.toml) instead of a site.
  pub pages: bool,
}

impl Docs {
  pub fn run(&self) -> Result<(), String> {
    if self.pages {
      return docs::pages::run(&self.config, self.out.clone()).map(|_| ());
    }
    let opts = DocsOptions {
      config: self.config.clone(),
      out: self.out.clone(),
      sidebar_only: !self.all,
    };
    docs::run(&opts)
  }
}
