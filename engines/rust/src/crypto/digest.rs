//! Template content digests: SHA-256, the same in all three engines (see
//! `docs/engines/contract.md`).

use sha2::{Digest, Sha256};

/// SHA-256 of `bytes`.
pub fn content(bytes: &[u8]) -> [u8; 32] {
  Sha256::digest(bytes).into()
}

/// SHA-256 of `bytes`, as lowercase hex.
pub fn hex(bytes: &[u8]) -> String {
  crate::crypto::hex::encode(content(bytes))
}

/// Lowercase hex of a digest from [`content`] (no re-hashing).
pub fn encode(digest: &[u8; 32]) -> String {
  crate::crypto::hex::encode(digest)
}
