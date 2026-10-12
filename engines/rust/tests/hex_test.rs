// Signatures use strict lowercase hex: malformed input is rejected, never
// panics, and there is exactly one accepted spelling (G3, G8).

use anza::crypto::{ed25519, hex, hmac};

const SECRET: &[u8] = b"0123456789abcdef0123456789abcdef";
const SEED: [u8; 32] = [7u8; 32];

fn public() -> [u8; 32] {
  ed25519_dalek::SigningKey::from_bytes(&SEED).verifying_key().to_bytes()
}

#[test]
fn non_ascii_signatures_do_not_panic() {
  for sig in ["€a", "a€", "€€", "ü", "\u{1F600}"] {
    assert!(!hmac::verify::check(SECRET, b"m", sig));
    assert!(!ed25519::verify::check(&public(), b"m", sig));
    assert_eq!(hex::decode(sig), None);
  }
  // Same byte length as a real signature, but multi-byte characters.
  let sixty_four_bytes = "€".repeat(21) + "a";
  assert!(!hmac::verify::check(SECRET, b"m", &sixty_four_bytes));
}

#[test]
fn trailing_garbage_is_rejected() {
  let sig = hmac::sign::payload(SECRET, b"m").unwrap();
  assert!(hmac::verify::check(SECRET, b"m", &sig));
  assert!(!hmac::verify::check(SECRET, b"m", &format!("{sig}zz")));
  assert!(!hmac::verify::check(SECRET, b"m", &format!("{sig}00")));
  assert!(!hmac::verify::check(SECRET, b"m", &sig[..62]));

  let sig = ed25519::sign::payload(&SEED, b"m").unwrap();
  assert!(ed25519::verify::check(&public(), b"m", &sig));
  assert!(!ed25519::verify::check(&public(), b"m", &format!("{sig}zz")));
  assert!(!ed25519::verify::check(&public(), b"m", &format!("{sig}00")));
}

#[test]
fn uppercase_is_rejected() {
  let sig = hmac::sign::payload(SECRET, b"m").unwrap();
  assert_eq!(sig, sig.to_lowercase());
  assert!(!hmac::verify::check(SECRET, b"m", &sig.to_uppercase()));

  let sig = ed25519::sign::payload(&SEED, b"m").unwrap();
  assert!(!ed25519::verify::check(&public(), b"m", &sig.to_uppercase()));
}
