use {
  crate::errors::{Error, Result},
  ed25519_dalek::{Signer, SigningKey},
};

pub fn payload(private_key_bytes: &[u8], data: &[u8]) -> Result<String> {
  if private_key_bytes.len() != 32 {
    return Err(Error::crypto("Ed25519 private key must be 32 bytes"));
  }
  let mut key_arr = [0u8; 32];
  key_arr.copy_from_slice(private_key_bytes);
  let signing_key = SigningKey::from_bytes(&key_arr);
  let signature = signing_key.sign(data);
  Ok(hex::encode(signature.to_bytes()))
}

mod hex {
  pub fn encode(bytes: impl AsRef<[u8]>) -> String {
    let mut s = String::with_capacity(bytes.as_ref().len() * 2);
    for &b in bytes.as_ref() {
      s.push_str(&format!("{:02x}", b));
    }
    s
  }
}
