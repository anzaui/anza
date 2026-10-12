# Cryptographic Verification

TLS protects each hop, but a CDN or proxy that terminates TLS can still change a
response. Signed envelopes let whoever receives a fragment check that it came
from the origin unchanged.

## 1. Signing modes

`anza::SignMode` (in `src/engine/cache/mod.rs`):

```rust
#[derive(Debug, Clone)]
pub enum SignMode {
  Ed25519 { private_key: Vec<u8>, public_key: Vec<u8>, publish_meta: bool },
  Hmac { secret: Vec<u8> },
  SessionBound,
  None,
}
```

Set it on `Setup` before `run()`:

```rust
use anza::{Setup, SignMode};

let mut setup = Setup::new("templates");
setup.signing = Setup::hmac(b"pre-shared-secret-key-32-bytes!!");
// or: files holding the raw 32-byte Ed25519 private key and public key
setup.signing = Setup::ed25519("keys/origin.key", "keys/origin.pub", false);
// or: no signature (the default)
setup.signing = SignMode::None;
let engine = setup.run()?;
```

| Mode | What happens | Verify with |
|---|---|---|
| **`Ed25519`** | `sig` = hex Ed25519 signature (64 bytes) | `anza::crypto::ed25519::verify::check` with the public key |
| **`Hmac`** | `sig` = hex HMAC-SHA256 (32 bytes) | `anza::crypto::hmac::verify::check` with the same secret |
| **`SessionBound`** | Reserved: no `sig` is added yet | — |
| **`None`** | No `sig` | — |

Notes:

- `Setup::ed25519` reads the key files and uses an empty key if a file is
  missing; the error then shows up on the first render
  (`Error::Crypto("Ed25519 private key must be 32 bytes")`).
- `publish_meta` is stored but not used: the engine does not inject the public
  key into pages.

## 2. Signed message

The signature covers the string `ts:slot:html`, exactly as produced by
`Envelope::message()`:

```text
format!("{}:{}:{}", envelope.ts, envelope.slot, envelope.html)
```

Changing the timestamp, slot or HTML breaks the signature. Checking that `ts` is
recent (to reject replays) is up to the verifier.

## 3. Who verifies

The engine only signs. The Anza browser library does **not** verify envelopes:
it has no envelope or stream handler. Verify on the server or edge that relays
fragments using the `check` functions, or in your own browser code with
`crypto.subtle.verify` (see [Ed25519](ed25519.md)).
