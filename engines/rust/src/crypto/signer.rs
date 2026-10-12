//! Signing keys, validated and decoded once at setup.

use {
  crate::{
    crypto::hex,
    engine::cache::SignMode,
    errors::{Error, Result},
  },
  ed25519_dalek::{Signer as _, SigningKey},
  hmac::{Hmac, Mac},
  sha2::Sha256,
  std::fmt,
};

/// Minimum HMAC-SHA256 secret length, in bytes.
pub const HMAC_MIN_SECRET: usize = 32;

/// A ready-to-use signing key. Built (and validated) from a [`SignMode`] by
/// `Setup::run`, so a running engine never signs with a missing, short or
/// mismatched key. `Debug` never prints key material.
#[derive(Clone)]
pub enum Signer {
  None,
  Hmac(Hmac<Sha256>),
  Ed25519(Box<SigningKey>),
}

impl Signer {
  /// Validate `mode` and decode its keys:
  /// - HMAC: the secret must be at least 32 bytes.
  /// - Ed25519: the private key must be a 32-byte seed; a non-empty public
  ///   key must be 32 bytes and match the one derived from the seed.
  pub fn new(mode: &SignMode) -> Result<Self> {
    match mode {
      SignMode::None => Ok(Self::None),
      SignMode::Hmac { secret } => {
        if secret.len() < HMAC_MIN_SECRET {
          return Err(Error::crypto(format!("HMAC secret must be at least {HMAC_MIN_SECRET} bytes")));
        }
        let mac = Hmac::<Sha256>::new_from_slice(secret).map_err(|_| Error::crypto("Invalid HMAC secret"))?;
        Ok(Self::Hmac(mac))
      }
      SignMode::Ed25519 { private_key, public_key } => {
        let seed: [u8; 32] = private_key
          .as_slice()
          .try_into()
          .map_err(|_| Error::crypto("Ed25519 private key must be a 32-byte seed"))?;
        let key = SigningKey::from_bytes(&seed);
        if !public_key.is_empty() {
          if public_key.len() != 32 {
            return Err(Error::crypto("Ed25519 public key must be 32 bytes"));
          }
          if key.verifying_key().as_bytes() != public_key.as_slice() {
            return Err(Error::crypto("Ed25519 public key does not match the private key"));
          }
        }
        Ok(Self::Ed25519(Box::new(key)))
      }
    }
  }

  /// Lowercase-hex signature of `message`, or `None` when signing is off.
  pub fn sign(&self, message: &[u8]) -> Option<String> {
    match self {
      Self::None => None,
      Self::Hmac(mac) => {
        let mut mac = mac.clone();
        mac.update(message);
        Some(hex::encode(mac.finalize().into_bytes()))
      }
      Self::Ed25519(key) => Some(hex::encode(key.sign(message).to_bytes())),
    }
  }

  /// Check a lowercase-hex signature made by this signer (constant-time).
  /// Always `false` when signing is off.
  pub fn verify(&self, message: &[u8], signature_hex: &str) -> bool {
    match self {
      Self::None => false,
      Self::Hmac(mac) => {
        let Some(expected) = hex::decode_array::<32>(signature_hex) else {
          return false;
        };
        let mut mac = mac.clone();
        mac.update(message);
        mac.verify_slice(&expected).is_ok()
      }
      Self::Ed25519(key) => crate::crypto::ed25519::verify::check(key.verifying_key().as_bytes(), message, signature_hex),
    }
  }

  /// The Ed25519 public key that verifies this signer's signatures.
  pub fn public_key(&self) -> Option<[u8; 32]> {
    match self {
      Self::Ed25519(key) => Some(key.verifying_key().to_bytes()),
      _ => None,
    }
  }
}

impl fmt::Debug for Signer {
  fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
    match self {
      Self::None => f.write_str("Signer::None"),
      Self::Hmac(_) => f.write_str("Signer::Hmac(<redacted>)"),
      Self::Ed25519(key) => write!(f, "Signer::Ed25519 {{ public_key: {} }}", hex::encode(key.verifying_key().as_bytes())),
    }
  }
}
