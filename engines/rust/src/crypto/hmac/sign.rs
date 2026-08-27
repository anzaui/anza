use {
  crate::errors::{Error, Result},
  hmac::{Hmac, Mac},
  sha2::Sha256,
};

type HmacSha256 = Hmac<Sha256>;

pub fn payload(secret: &[u8], data: &[u8]) -> Result<String> {
  let mut mac = HmacSha256::new_from_slice(secret)
    .map_err(|e| Error::crypto(format!("Invalid HMAC key: {}", e)))?;
  mac.update(data);
  let result = mac.finalize();
  Ok(hex::encode(result.into_bytes()))
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
