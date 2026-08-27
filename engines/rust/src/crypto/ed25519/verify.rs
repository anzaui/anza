use {
  ed25519_dalek::{Signature, Verifier, VerifyingKey},
};

pub fn check(public_key_bytes: &[u8], data: &[u8], signature_hex: &str) -> bool {
  if public_key_bytes.len() != 32 {
    return false;
  }
  let mut key_arr = [0u8; 32];
  key_arr.copy_from_slice(public_key_bytes);
  let verifying_key = match VerifyingKey::from_bytes(&key_arr) {
    Ok(k) => k,
    Err(_) => return false,
  };

  let sig_bytes = match hex::decode(signature_hex) {
    Some(b) => b,
    None => return false,
  };

  if sig_bytes.len() != 64 {
    return false;
  }
  let mut sig_arr = [0u8; 64];
  sig_arr.copy_from_slice(&sig_bytes);
  let signature = Signature::from_bytes(&sig_arr);

  verifying_key.verify(data, &signature).is_ok()
}

mod hex {
  pub fn decode(s: &str) -> Option<Vec<u8>> {
    if s.len() % 2 != 0 {
      return None;
    }
    (0..s.len())
      .step_by(2)
      .map(|i| u8::from_str_radix(&s[i..i + 2], 16).ok())
      .collect()
  }
}
