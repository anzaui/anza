use {
  crate::engine::file::Template,
  std::{collections::HashMap, sync::RwLock},
};

pub struct CacheStore {
  pub templates: RwLock<HashMap<String, Template>>,
}

impl CacheStore {
  pub fn new(initial: HashMap<String, Template>) -> Self {
    Self {
      templates: RwLock::new(initial),
    }
  }

  pub fn insert(&self, key: String, template: Template) {
    if let Ok(mut lock) = self.templates.write() {
      lock.insert(key, template);
    }
  }

  pub fn remove(&self, key: &str) {
    if let Ok(mut lock) = self.templates.write() {
      lock.remove(key);
    }
  }
}
