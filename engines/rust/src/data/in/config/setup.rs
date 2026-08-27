use {
  crate::{
    engine::cache::{Engine, SignMode},
    engine::file,
    engine::cache::store::CacheStore,
    errors::{Error, Result},
  },
  std::{path::PathBuf, sync::Arc},
};

#[derive(Debug, Clone)]
pub struct Setup {
  pub root: PathBuf,
  pub signing: SignMode,
  pub watch: bool,
}

impl Setup {
  pub fn new<P: Into<PathBuf>>(root: P) -> Self {
    Self {
      root: root.into(),
      signing: SignMode::None,
      watch: false,
    }
  }

  pub fn ed25519<P: Into<PathBuf>>(priv_path: P, pub_path: P, publish_meta: bool) -> SignMode {
    let private_key = std::fs::read(priv_path.into()).unwrap_or_default();
    let public_key = std::fs::read(pub_path.into()).unwrap_or_default();
    SignMode::Ed25519 {
      private_key,
      public_key,
      publish_meta,
    }
  }

  pub fn hmac(secret: &[u8]) -> SignMode {
    SignMode::Hmac {
      secret: secret.to_vec(),
    }
  }

  pub fn validate(&self) -> Result<()> {
    if !self.root.exists() {
      return Err(Error::validation(format!("Template root directory does not exist: {}", self.root.display())));
    }
    Ok(())
  }

  pub fn run(&self) -> Result<Engine> {
    self.validate()?;
    let templates = file::load::all(&self.root)?;
    let watcher = if self.watch {
      Some(file::watch::listen(&self.root)?)
    } else {
      None
    };

    Ok(Engine {
      root: self.root.clone(),
      cache: Arc::new(CacheStore::new(templates)),
      signing: self.signing.clone(),
      watcher,
    })
  }
}
