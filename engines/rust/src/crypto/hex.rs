//! Strict lowercase hex, the only encoding used for signatures and digests on
//! the wire. Decoding is byte-wise (it never slices the string, so non-ASCII
//! input cannot panic) and rejects uppercase digits and odd lengths, so a
//! signature has exactly one accepted spelling.

const DIGITS: &[u8; 16] = b"0123456789abcdef";

/// Lowercase hex of `bytes`.
pub fn encode(bytes: impl AsRef<[u8]>) -> String {
  let bytes = bytes.as_ref();
  let mut out = String::with_capacity(bytes.len() * 2);
  for &b in bytes {
    out.push(DIGITS[(b >> 4) as usize] as char);
    out.push(DIGITS[(b & 0x0f) as usize] as char);
  }
  out
}

#[inline]
fn nibble(c: u8) -> Option<u8> {
  match c {
    b'0'..=b'9' => Some(c - b'0'),
    b'a'..=b'f' => Some(c - b'a' + 10),
    _ => None,
  }
}

/// Decode lowercase, even-length hex. `None` for anything else.
pub fn decode(s: &str) -> Option<Vec<u8>> {
  let bytes = s.as_bytes();
  if bytes.len() % 2 != 0 {
    return None;
  }
  bytes
    .chunks_exact(2)
    .map(|pair| Some((nibble(pair[0])? << 4) | nibble(pair[1])?))
    .collect()
}

/// Decode exactly `N` bytes of lowercase hex. `None` for anything else.
pub fn decode_array<const N: usize>(s: &str) -> Option<[u8; N]> {
  let bytes = s.as_bytes();
  if bytes.len() != N * 2 {
    return None;
  }
  let mut out = [0u8; N];
  for (i, pair) in bytes.chunks_exact(2).enumerate() {
    out[i] = (nibble(pair[0])? << 4) | nibble(pair[1])?;
  }
  Some(out)
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn round_trip() {
    assert_eq!(encode([0x00, 0xab, 0xff]), "00abff");
    assert_eq!(decode("00abff"), Some(vec![0x00, 0xab, 0xff]));
    assert_eq!(decode(""), Some(vec![]));
  }

  #[test]
  fn strict() {
    assert_eq!(decode("ABFF"), None);
    assert_eq!(decode("abf"), None);
    assert_eq!(decode("zz"), None);
    assert_eq!(decode("€a"), None);
    assert_eq!(decode("a€"), None);
    assert_eq!(decode("+1"), None);
    assert_eq!(decode_array::<2>("abff"), Some([0xab, 0xff]));
    assert_eq!(decode_array::<2>("abffab"), None);
    assert_eq!(decode_array::<2>("€€"), None);
  }
}
