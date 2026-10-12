pub mod lookup;
pub mod store;

use {
  crate::{
    crypto::{
      blake,
      envelope::{self, VerifyOptions},
      signer::Signer,
    },
    engine::file::{self, Template},
    errors::{Error, Result},
    models::{document::Document, envelope::Envelope, manifest::Manifest},
  },
  std::{
    collections::HashMap,
    path::PathBuf,
    sync::Arc,
  },
  store::CacheStore,
};

/// How fragments are signed. Keys are validated by `Setup::run`; `Debug`
/// never prints key material.
#[derive(Clone)]
pub enum SignMode {
  Ed25519 {
    private_key: Vec<u8>,
    public_key: Vec<u8>,
  },
  Hmac {
    secret: Vec<u8>,
  },
  None,
}

impl std::fmt::Debug for SignMode {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    match self {
      Self::Ed25519 { private_key, public_key } => f
        .debug_struct("Ed25519")
        .field("private_key", &Redacted(private_key.len()))
        .field("public_key", &crate::crypto::hex::encode(public_key))
        .finish(),
      Self::Hmac { secret } => f.debug_struct("Hmac").field("secret", &Redacted(secret.len())).finish(),
      Self::None => f.write_str("None"),
    }
  }
}

struct Redacted(usize);

impl std::fmt::Debug for Redacted {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    write!(f, "<redacted {} bytes>", self.0)
  }
}

pub struct Engine {
  pub root: PathBuf,
  pub cache: Arc<CacheStore>,
  pub watcher: Option<file::FileWatcher>,
  pub(crate) signer: Signer,
  /// Fragment allowlist (see `Setup::fragments`).
  pub(crate) fragments: Vec<String>,
}

impl Engine {
  pub fn get(&self, name: &str) -> Result<Template> {
    lookup::get(&self.cache, name)
  }

  pub fn manifest(&self) -> Result<Manifest> {
    let mut manifest = Manifest::new();
    let lock = self.cache.templates.read().map_err(|e| Error::internal(e.to_string()))?;
    for (name, tpl) in lock.iter() {
      manifest.insert(name.clone(), blake::digest::encode(&tpl.digest));
    }
    Ok(manifest)
  }

  /// The validated signing key (`Debug` is redacted).
  pub fn signer(&self) -> &Signer {
    &self.signer
  }

  /// Sign the v2 message of `ts`, `slot`, `html` (no `css`). `None` when
  /// signing is off.
  pub fn sign_payload(&self, ts: u64, slot: &str, html: &str) -> Result<Option<String>> {
    Ok(self.signer.sign(&envelope::message(ts, slot, html, None)))
  }

  /// Verify an envelope against this engine's own key (HMAC secret or the
  /// Ed25519 public key): see [`crate::crypto::envelope::verify`].
  pub fn verify_envelope(&self, envelope: &Envelope, options: &VerifyOptions<'_>) -> Result<()> {
    if matches!(self.signer, Signer::None) {
      return Err(Error::crypto("signing is off"));
    }
    envelope::verify_with(envelope, options, |msg, sig| self.signer.verify(msg, sig))
  }

  /// Render `template_name` into a (signed) envelope for `slot`. Templates
  /// outside the `fragments` allowlist are reported as not found.
  pub fn render_fragment(&self, template_name: &str, slot: &str, params: &HashMap<String, String>) -> Result<Envelope> {
    let tpl = self.get(template_name)?;
    if !crate::engine::name::allowed(&self.fragments, template_name) {
      return Err(Error::not_found(format!("Template '{}' not found", template_name)));
    }
    let html = tpl.bind(params)?;
    let ts = envelope::now()?;
    let sig = self.signer.sign(&envelope::message(ts, slot, &html, None));

    Ok(Envelope {
      v: envelope::VERSION,
      slot: slot.to_string(),
      ts,
      html,
      sig,
      css: None,
    })
  }

  pub fn render_page(&self, route: &str, params: &HashMap<String, String>) -> Result<Document> {
    crate::render::page::compile::document(self, route, params)
  }
}
