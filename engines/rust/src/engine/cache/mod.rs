pub mod lookup;
pub mod store;

use {
  crate::{
    crypto::{blake, signer::Signer},
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

  pub fn sign_payload(&self, ts: u64, slot: &str, html: &str) -> Result<Option<String>> {
    let msg = format!("{}:{}:{}", ts, slot, html);
    Ok(self.signer.sign(msg.as_bytes()))
  }

  pub fn render_fragment(&self, template_name: &str, slot: &str, params: &HashMap<String, String>) -> Result<Envelope> {
    let tpl = self.get(template_name)?;
    let html = tpl.bind(params)?;
    let ts = std::time::SystemTime::now()
      .duration_since(std::time::UNIX_EPOCH)
      .map_err(|_| Error::internal("Clock error"))?
      .as_secs();

    let sig = self.sign_payload(ts, slot, &html)?;

    Ok(Envelope {
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
