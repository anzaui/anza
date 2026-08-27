use {
  crate::errors::{Error, Result},
  hkdf::Hkdf,
  sha2::Sha256,
};

pub fn key(ikm: &[u8], salt: Option<&[u8]>, info: &[u8]) -> Result<[u8; 32]> {
  let hk = Hkdf::<Sha256>::new(salt, ikm);
  let mut okm = [0u8; 32];
  hk.expand(info, &mut okm)
    .map_err(|e| Error::crypto(format!("HKDF expansion failed: {}", e)))?;
  Ok(okm)
}
