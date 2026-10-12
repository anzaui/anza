pub fn content(bytes: &[u8]) -> [u8; 32] {
  let hash = blake3::hash(bytes);
  *hash.as_bytes()
}

/// BLAKE3 of `bytes`, as lowercase hex.
pub fn hex(bytes: &[u8]) -> String {
  blake3::hash(bytes).to_hex().to_string()
}

/// Lowercase hex of a digest from [`content`] (no re-hashing).
pub fn encode(digest: &[u8; 32]) -> String {
  crate::crypto::hex::encode(digest)
}
