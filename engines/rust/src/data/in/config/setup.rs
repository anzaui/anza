use {
  crate::{
    crypto::signer::Signer,
    engine::cache::{Engine, SignMode},
    engine::file,
    engine::cache::store::CacheStore,
    errors::{Error, Result},
  },
  std::{
    path::{Path, PathBuf},
    sync::Arc,
  },
};

#[derive(Debug, Clone)]
pub struct Setup {
  pub root: PathBuf,
  pub signing: SignMode,
  pub watch: bool,
  /// Fragment allowlist. Empty (the default) lets `render_fragment` use any
  /// template; otherwise an entry ending in `/` allows that prefix (e.g.
  /// `"fragments/"`) and any other entry allows that exact name.
  pub fragments: Vec<String>,
  /// HTML-escape `{{slot}}` values; `{{{slot}}}` stays raw. Off by default
  /// (values are inserted as-is), see `docs/engines/contract.md`.
  pub escape: bool,
  /// Refuse template files larger than this (default 1 MiB).
  pub max_template_bytes: usize,
}

impl Setup {
  pub fn new<P: Into<PathBuf>>(root: P) -> Self {
    Self {
      root: root.into(),
      signing: SignMode::None,
      watch: false,
      fragments: Vec::new(),
      escape: false,
      max_template_bytes: file::load::DEFAULT_MAX_TEMPLATE_BYTES,
    }
  }

  /// Ed25519 signing from raw key files: a 32-byte private seed and its
  /// 32-byte public key. A missing or unreadable file is an error, and
  /// `run()` checks that the public key matches the seed.
  pub fn ed25519<P: AsRef<Path>>(priv_path: P, pub_path: P) -> Result<SignMode> {
    let read = |path: &Path, what: &str| {
      std::fs::read(path).map_err(|e| Error::crypto(format!("Cannot read Ed25519 {what} key file {}: {}", path.display(), e.kind())))
    };
    Ok(SignMode::Ed25519 {
      private_key: read(priv_path.as_ref(), "private")?,
      public_key: read(pub_path.as_ref(), "public")?,
    })
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

  fn load_options(&self) -> file::LoadOptions {
    file::LoadOptions {
      escape: self.escape,
      max_bytes: self.max_template_bytes,
    }
  }

  /// Validate the root and the signing keys, load every template, and start
  /// the watcher when `watch` is set.
  pub fn run(&self) -> Result<Engine> {
    self.validate()?;
    let signer = Signer::new(&self.signing)?;
    let options = self.load_options();
    let templates = file::load::all_with(&self.root, &options)?;
    let cache = Arc::new(CacheStore::new(templates));
    // With the `watch` feature, template edits are reloaded into the cache.
    let watcher = if self.watch {
      Some(file::watch::listen(&self.root, cache.clone(), options)?)
    } else {
      None
    };

    Ok(Engine {
      root: self.root.clone(),
      cache,
      watcher,
      signer,
      fragments: self.fragments.clone(),
    })
  }
}
