use {
  crate::engine::file::Template,
  std::{
    collections::HashMap,
    sync::{Arc, RwLock},
  },
};

/// Parsed templates by name. Entries are shared (`Arc`), so a lookup never
/// copies a template.
pub struct CacheStore {
  pub templates: RwLock<HashMap<String, Arc<Template>>>,
}

impl CacheStore {
  pub fn new(initial: HashMap<String, Template>) -> Self {
    Self {
      templates: RwLock::new(initial.into_iter().map(|(k, v)| (k, Arc::new(v))).collect()),
    }
  }

  pub fn insert(&self, key: String, template: Template) {
    if let Ok(mut lock) = self.templates.write() {
      lock.insert(key, Arc::new(template));
    }
  }

  pub fn remove(&self, key: &str) {
    if let Ok(mut lock) = self.templates.write() {
      lock.remove(key);
    }
  }
}
