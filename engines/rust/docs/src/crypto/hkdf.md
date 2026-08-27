# Session Key Derivation via HKDF

When applications stream personalized or user-scoped components, each user session requires an isolated signing key to prevent cross-tenant message forgery.

## 1. HKDF-SHA256 Derivation Architecture

Instead of storing ephemeral signing keys in Redis or server memory, Anza derives deterministic 32-byte stream keys from the user's session token or JWT signature using HMAC-based Extract-and-Expand Key Derivation (HKDF-SHA256, RFC 5869).

```
   User Session Token / JWT Signature
                  │
                  ▼ (IKM: Input Keying Material)
     ┌────────────────────────┐
     │      HKDF-Extract      │ ◄── Master Salt (Configured on Engine)
     └───────────┬────────────┘
                 │ (PRK: Pseudorandom Key)
                 ▼
     ┌────────────────────────┐
     │      HKDF-Expand       │ ◄── Info: "anza-stui-user-stream-v1"
     └───────────┬────────────┘
                 │
                 ▼
      User-Scoped 32-byte Stream Key
```

## 2. Rust API Usage

Located in `src/crypto/hkdf/derive.rs`:

```rust
use anza::crypto::hkdf::derive as derive_key;

let session_token = b"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
let engine_salt = b"anza-cluster-salt-2026";
let info = b"user-live-feed";

let user_stream_key = derive_key(session_token, engine_salt, info, 32)?;
assert_eq!(user_stream_key.len(), 32);
```

### Properties

1. **Stateless**: The server re-derives the stream key on incoming SSE requests without cache lookups or database hits.
2. **Cryptographic Isolation**: Knowing one user's derived key provides zero information about other users' keys.
