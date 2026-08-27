pub fn content(bytes: &[u8]) -> [u8; 32] {
  let hash = blake3::hash(bytes);
  *hash.as_bytes()
}

pub fn hex(bytes: &[u8]) -> String {
  blake3::hash(bytes).to_hex().to_string()
}
