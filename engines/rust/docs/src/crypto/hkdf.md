# Key Derivation with HKDF

The crate includes an HKDF-SHA256 helper (RFC 5869) for deriving per-session
keys, for example a per-user HMAC secret from a session token.

> `SignMode::SessionBound` does not use it yet: that mode adds no signature.
> To sign per session today, derive a key and build an engine (or call
> `anza::crypto::hmac::sign::payload`) with it yourself.

## 1. Rust API

`src/crypto/hkdf/derive.rs`:

```rust
// anza::crypto::hkdf::derive
pub fn key(ikm: &[u8], salt: Option<&[u8]>, info: &[u8]) -> anza::Result<[u8; 32]>;
```

```rust
use anza::crypto::{hkdf::derive, hmac::sign};

let session_token = b"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
let salt = b"anza-cluster-salt-2026";

let user_key: [u8; 32] = derive::key(session_token, Some(salt), b"user-live-feed")?;

let envelope_message = b"1724771200:feed:<ui-card>Hi</ui-card>";
let sig = sign::payload(&user_key, envelope_message)?;
```

## 2. Properties

1. **Stateless**: the same inputs always give the same key, so the server can
   re-derive it per request.
2. **Isolation**: knowing one derived key does not reveal the input key or other
   derived keys.
