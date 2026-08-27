use std::path::PathBuf;
use crate::generate::{self, Generated, Kind, Options};

#[derive(Debug, Clone)]
pub struct Generate {
  pub src: PathBuf,
  pub kind: String,
  pub name: String,
  pub tree: Option<String>,
  pub route: Option<String>,
  pub via: Option<String>,
  pub parent: Option<String>,
}

impl Generate {
  pub fn run(&self) -> Result<Generated, String> {
    let kind = Kind::parse(&self.kind)?;
    let via = self.via.as_ref().map(|v| {
      v.split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
    });
    let opts = Options {
      name: self.name.clone(),
      tree: self.tree.clone(),
      route: self.route.clone(),
      via,
      parent: self.parent.clone(),
    };
    generate::run(&self.src, kind, &opts)
  }
}
