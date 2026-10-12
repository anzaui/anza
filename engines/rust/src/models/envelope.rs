use serde::{Deserialize, Serialize};

/// A rendered fragment on the wire (format v2, see `docs/engines/contract.md`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Envelope {
  /// Wire-format version. Always 2 for envelopes this engine produces; an
  /// envelope without `v` deserializes as 0 and fails verification.
  #[serde(default)]
  pub v: u32,
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
      v: crate::crypto::envelope::VERSION,
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

  /// The exact bytes the signature covers (v2, length-prefixed fields).
  pub fn message(&self) -> Vec<u8> {
    crate::crypto::envelope::message(self.ts, &self.slot, &self.html, self.css.as_deref())
  }
}
