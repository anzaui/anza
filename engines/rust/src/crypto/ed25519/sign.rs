use {
  crate::{
    crypto::hex,
    errors::{Error, Result},
  },
  ed25519_dalek::{Signer, SigningKey},
};

pub fn payload(private_key_bytes: &[u8], data: &[u8]) -> Result<String> {
  let seed: [u8; 32] = private_key_bytes
    .try_into()
    .map_err(|_| Error::crypto("Ed25519 private key must be 32 bytes"))?;
  let signing_key = SigningKey::from_bytes(&seed);
  Ok(hex::encode(signing_key.sign(data).to_bytes()))
}
