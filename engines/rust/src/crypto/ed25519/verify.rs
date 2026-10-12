use {
  crate::crypto::hex,
  ed25519_dalek::{Signature, Verifier, VerifyingKey},
};

/// Verify a lowercase-hex Ed25519 signature. Malformed keys or signatures
/// (wrong length, non-hex, uppercase, non-ASCII) return `false`.
pub fn check(public_key_bytes: &[u8], data: &[u8], signature_hex: &str) -> bool {
  let Ok(key) = <[u8; 32]>::try_from(public_key_bytes) else {
    return false;
  };
  let Ok(verifying_key) = VerifyingKey::from_bytes(&key) else {
    return false;
  };
  let Some(sig) = hex::decode_array::<64>(signature_hex) else {
    return false;
  };
  verifying_key.verify(data, &Signature::from_bytes(&sig)).is_ok()
}
