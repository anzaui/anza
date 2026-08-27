use {
  crate::{
    engine::cache::Engine,
    errors::{Error, Result},
    models::envelope::Envelope,
  },
  serde::{Deserialize, Serialize},
  std::collections::HashMap,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Stream {
  pub template: String,
  pub slot: String,
  pub params: HashMap<String, String>,
}

impl Stream {
  pub fn new<S: Into<String>>(template: S, slot: S) -> Self {
    Self {
      template: template.into(),
      slot: slot.into(),
      params: HashMap::new(),
    }
  }

  pub fn param<K: Into<String>, V: Into<String>>(mut self, key: K, value: V) -> Self {
    self.params.insert(key.into(), value.into());
    self
  }

  pub fn validate(&self) -> Result<()> {
    if self.template.is_empty() {
      return Err(Error::validation("Template cannot be empty"));
    }
    if self.slot.is_empty() {
      return Err(Error::validation("Slot cannot be empty"));
    }
    Ok(())
  }

  pub fn run(&self, engine: &Engine) -> Result<Envelope> {
    self.validate()?;
    engine.render_fragment(&self.template, &self.slot, &self.params)
  }
}
