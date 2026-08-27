# HMAC-SHA256 & Tamper Rejection

HMAC-SHA256 provides symmetric signing for microfrontend clusters, internal RPC services, and direct client-server connections sharing a pre-shared secret.

## 1. Rust API Usage

Located in `src/crypto/hmac/sign.rs` and `src/crypto/hmac/verify.rs`:

```rust
use anza::crypto::hmac::{sign, verify};

let secret = b"my-secure-cluster-shared-secret-32b";
let payload = b"1724771200:feed:<ui-alert>OK</ui-alert>";

// 1. Sign
let sig = sign(secret, payload)?;

// 2. Constant-time verification
let ok = verify(secret, payload, &sig)?;
assert!(ok);
```

## 2. Constant-Time Timing-Safe Verification

To protect against side-channel timing attacks, `verify()` compares signatures in constant time:

```rust
pub fn verify(secret: &[u8], data: &[u8], signature_hex: &str) -> Result<bool> {
  let expected = sign(secret, data)?;
  let expected_bytes = hex::decode(&expected).map_err(|e| Error::Crypto(e.to_string()))?;
  let actual_bytes = hex::decode(signature_hex).map_err(|e| Error::Crypto(e.to_string()))?;

  if expected_bytes.len() != actual_bytes.len() {
    return Ok(false);
  }

  // Constant-time XOR comparison
  let mut diff = 0u8;
  for (a, b) in expected_bytes.iter().zip(actual_bytes.iter()) {
    diff |= a ^ b;
  }

  Ok(diff == 0)
}
```

## 3. Tamper Rejection Test Guarantees

Any modification to the rendered HTML, target slot identifier, or timestamp causes immediate verification rejection:

```rust
// Modifying a single character in the HTML
let tampered_payload = b"1724771200:feed:<ui-alert>Corrupted</ui-alert>";
assert_eq!(verify(secret, tampered_payload, &sig)?, false);

// Replay attack with modified timestamp
let stale_payload = b"1724779999:feed:<ui-alert>OK</ui-alert>";
assert_eq!(verify(secret, stale_payload, &sig)?, false);
```
