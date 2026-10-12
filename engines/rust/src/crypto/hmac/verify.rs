use {
  crate::crypto::hex,
  hmac::{Hmac, Mac},
  sha2::Sha256,
};

type HmacSha256 = Hmac<Sha256>;

/// Verify a lowercase-hex HMAC-SHA256 signature in constant time. Malformed
/// signatures (wrong length, non-hex, uppercase, non-ASCII) return `false`.
pub fn check(secret: &[u8], data: &[u8], signature_hex: &str) -> bool {
  let Some(expected) = hex::decode_array::<32>(signature_hex) else {
    return false;
  };
  let Ok(mut mac) = HmacSha256::new_from_slice(secret) else {
    return false;
  };
  mac.update(data);
  mac.verify_slice(&expected).is_ok()
}
