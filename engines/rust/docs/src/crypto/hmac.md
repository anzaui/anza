# HMAC-SHA256

HMAC-SHA256 uses one shared secret for signing and verifying. Use it when every
verifier is trusted with the secret (internal services, your own edge). Never
ship the secret to browsers.

## 1. Rust API

`src/crypto/hmac/sign.rs` and `src/crypto/hmac/verify.rs`:

```rust
// anza::crypto::hmac::sign
pub fn payload(secret: &[u8], data: &[u8]) -> anza::Result<String>;
// anza::crypto::hmac::verify
pub fn check(secret: &[u8], data: &[u8], signature_hex: &str) -> bool;
```

```rust
use anza::crypto::hmac::{sign, verify};

let secret = b"my-secure-cluster-shared-secret-32b";
let message = b"1724771200:feed:<ui-alert>OK</ui-alert>";

let sig = sign::payload(secret, message)?;
assert!(verify::check(secret, message, &sig));
```

## 2. Constant-time comparison

`check` recomputes the MAC and compares it with `Mac::verify_slice` from the
`hmac` crate, which compares in constant time. It returns `false` for invalid
hex or a wrong signature.

## 3. Tampering

Any change to the timestamp, slot or HTML makes verification fail:

```rust
let tampered = b"1724771200:feed:<ui-alert>Corrupted</ui-alert>";
assert!(!verify::check(secret, tampered, &sig));

let other_time = b"1724779999:feed:<ui-alert>OK</ui-alert>";
assert!(!verify::check(secret, other_time, &sig));
```

Replaying an old, unchanged envelope still verifies; reject old `ts` values
yourself.
