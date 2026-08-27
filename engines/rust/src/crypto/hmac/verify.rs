use {
  hmac::{Hmac, Mac},
  sha2::Sha256,
};

type HmacSha256 = Hmac<Sha256>;

pub fn check(secret: &[u8], data: &[u8], signature_hex: &str) -> bool {
  let mut mac = match HmacSha256::new_from_slice(secret) {
    Ok(m) => m,
    Err(_) => return false,
  };
  mac.update(data);

  let expected = match hex::decode(signature_hex) {
    Some(b) => b,
    None => return false,
  };

  mac.verify_slice(&expected).is_ok()
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
