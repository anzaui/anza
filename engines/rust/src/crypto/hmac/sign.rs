use {
  crate::{
    crypto::hex,
    errors::{Error, Result},
  },
  hmac::{Hmac, Mac},
  sha2::Sha256,
};

type HmacSha256 = Hmac<Sha256>;

pub fn payload(secret: &[u8], data: &[u8]) -> Result<String> {
  let mut mac = HmacSha256::new_from_slice(secret).map_err(|_| Error::crypto("Invalid HMAC key"))?;
  mac.update(data);
  Ok(hex::encode(mac.finalize().into_bytes()))
}
