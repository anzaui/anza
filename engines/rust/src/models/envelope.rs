use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Envelope {
  pub slot: String,
  pub ts: u64,
  pub html: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub sig: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub css: Option<String>,
}

impl Envelope {
  pub fn new<S: Into<String>>(slot: S, ts: u64, html: S) -> Self {
    Self {
      slot: slot.into(),
      ts,
      html: html.into(),
      sig: None,
      css: None,
    }
  }

  pub fn sign<S: Into<String>>(mut self, signature: S) -> Self {
    self.sig = Some(signature.into());
    self
  }

  pub fn style<S: Into<String>>(mut self, css: S) -> Self {
    self.css = Some(css.into());
    self
  }

  pub fn message(&self) -> String {
    format!("{}:{}:{}", self.ts, self.slot, self.html)
  }
}
