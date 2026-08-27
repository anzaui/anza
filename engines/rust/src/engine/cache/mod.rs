pub mod lookup;
pub mod store;

use {
  crate::{
    crypto::{blake, ed25519, hmac},
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

#[derive(Debug, Clone)]
pub enum SignMode {
  Ed25519 {
    private_key: Vec<u8>,
    public_key: Vec<u8>,
    publish_meta: bool,
  },
  Hmac {
    secret: Vec<u8>,
  },
  SessionBound,
  None,
}

pub struct Engine {
  pub root: PathBuf,
  pub cache: Arc<CacheStore>,
  pub signing: SignMode,
  pub watcher: Option<file::FileWatcher>,
}

impl Engine {
  pub fn get(&self, name: &str) -> Result<Template> {
    lookup::get(&self.cache, name)
  }

  pub fn manifest(&self) -> Result<Manifest> {
    let mut manifest = Manifest::new();
    let lock = self.cache.templates.read().map_err(|e| Error::internal(e.to_string()))?;
    for (name, tpl) in lock.iter() {
      manifest.insert(name.clone(), blake::digest::hex(&tpl.digest));
    }
    Ok(manifest)
  }

  pub fn sign_payload(&self, ts: u64, slot: &str, html: &str) -> Result<Option<String>> {
    match &self.signing {
      SignMode::Ed25519 { private_key, .. } => {
        let msg = format!("{}:{}:{}", ts, slot, html);
        let sig = ed25519::sign::payload(private_key, msg.as_bytes())?;
        Ok(Some(sig))
      }
      SignMode::Hmac { secret } => {
        let msg = format!("{}:{}:{}", ts, slot, html);
        let sig = hmac::sign::payload(secret, msg.as_bytes())?;
        Ok(Some(sig))
      }
      SignMode::SessionBound | SignMode::None => Ok(None),
    }
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
