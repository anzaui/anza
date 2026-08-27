use {
  crate::{
    engine::cache::Engine,
    errors::{Error, Result},
    models::document::Document,
  },
  serde::{Deserialize, Serialize},
  std::collections::HashMap,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Page {
  pub route: String,
  pub params: HashMap<String, String>,
}

impl Page {
  pub fn new<S: Into<String>>(route: S) -> Self {
    Self {
      route: route.into(),
      params: HashMap::new(),
    }
  }

  pub fn param<K: Into<String>, V: Into<String>>(mut self, key: K, value: V) -> Self {
    self.params.insert(key.into(), value.into());
    self
  }

  pub fn validate(&self) -> Result<()> {
    if self.route.is_empty() {
      return Err(Error::validation("Route cannot be empty"));
    }
    Ok(())
  }

  pub fn run(&self, engine: &Engine) -> Result<Document> {
    self.validate()?;
    engine.render_page(&self.route, &self.params)
  }
}
