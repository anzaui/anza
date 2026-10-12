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
use anza::crypto::{envelope, hmac::{sign, verify}};

let secret = b"my-secure-cluster-shared-secret-32b";
let message = envelope::message(1_724_771_200, "feed", "<ui-alert>OK</ui-alert>", None);

let sig = sign::payload(secret, &message)?;
assert!(verify::check(secret, &message, &sig));
```

When signing through the engine, `Setup::run()` rejects a secret shorter than
32 bytes with an `Error::Crypto`.

## 2. Constant-time comparison

`check` recomputes the MAC and compares it with `Mac::verify_slice` from the
`hmac` crate, which compares in constant time. It returns `false` for invalid
hex (including uppercase or odd-length hex) or a wrong signature.

## 3. Tampering

Any change to the timestamp, slot or HTML makes verification fail:

```rust
let tampered = envelope::message(1_724_771_200, "feed", "<ui-alert>Corrupted</ui-alert>", None);
assert!(!verify::check(secret, &tampered, &sig));

let other_time = envelope::message(1_724_779_999, "feed", "<ui-alert>OK</ui-alert>", None);
assert!(!verify::check(secret, &other_time, &sig));
```

`check` alone accepts a replayed old envelope, or one replayed into another
slot. `anza::verify_envelope` also checks the version, the age and the slot:

```rust
use anza::{verify_envelope, VerifyKey, VerifyOptions};

verify_envelope(VerifyKey::Hmac(secret), &received, &VerifyOptions::new("feed", 60))?;
```

It fails with `Error::Crypto` (`envelope expired`, `slot mismatch`,
`bad signature`, ...); a secret shorter than 32 bytes is
`invalid verification key`.
