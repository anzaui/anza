use {
  serde::{Deserialize, Serialize},
  std::collections::HashMap,
};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Manifest {
  pub templates: HashMap<String, String>,
}

impl Manifest {
  pub fn new() -> Self {
    Self {
      templates: HashMap::new(),
    }
  }

  pub fn insert<K: Into<String>, V: Into<String>>(&mut self, key: K, digest: V) {
    self.templates.insert(key.into(), digest.into());
  }

  pub fn get(&self, key: &str) -> Option<&str> {
    self.templates.get(key).map(|s| s.as_str())
  }
}

impl Default for Manifest {
  fn default() -> Self {
    Self::new()
  }
}
