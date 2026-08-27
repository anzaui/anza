use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Document {
  pub html: String,
}

impl Document {
  pub fn new<S: Into<String>>(html: S) -> Self {
    Self { html: html.into() }
  }

  pub fn as_str(&self) -> &str {
    &self.html
  }

  pub fn into_bytes(self) -> Vec<u8> {
    self.html.into_bytes()
  }
}
