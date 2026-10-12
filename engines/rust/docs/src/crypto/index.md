# Cryptographic Verification

TLS protects each hop, but a CDN or proxy that terminates TLS can still change a
response. Signed envelopes let whoever receives a fragment check that it came
from the origin unchanged.

## 1. Signing modes

`anza::SignMode` (in `src/engine/cache/mod.rs`):

```rust
#[derive(Clone)] // Debug is implemented by hand and redacts keys
pub enum SignMode {
  Ed25519 { private_key: Vec<u8>, public_key: Vec<u8> },
  Hmac { secret: Vec<u8> },
  None,
}
```

Set it on `Setup` before `run()`:

```rust
use anza::{Setup, SignMode};

let mut setup = Setup::new("templates");
setup.signing = Setup::hmac(b"pre-shared-secret-key-32-bytes!!");
// or: files holding the raw 32-byte Ed25519 private seed and public key
setup.signing = Setup::ed25519("keys/origin.key", "keys/origin.pub")?;
// or: no signature (the default)
setup.signing = SignMode::None;
let engine = setup.run()?;
```

| Mode | What happens | Verify with |
|---|---|---|
| **`Ed25519`** | `sig` = hex Ed25519 signature (64 bytes, 128 hex characters) | `anza::verify_envelope` with `VerifyKey::Ed25519(&public_key)` |
| **`Hmac`** | `sig` = hex HMAC-SHA256 (32 bytes, 64 hex characters) | `anza::verify_envelope` with `VerifyKey::Hmac(&secret)` |
| **`None`** | No `sig` | — |

Notes:

- `Setup::ed25519` returns `Result<SignMode>`: a missing or unreadable key
  file is an `Error::Crypto` right away.
- Keys are validated once, in `Setup::run()`. These are `Error::Crypto` at
  setup, never an unsigned envelope or a render-time error: an HMAC secret
  shorter than 32 bytes, an Ed25519 private key that is not a 32-byte seed, and
  a public key that is given but doesn't match the seed. `public_key` may be
  empty; the engine then derives it from the seed.
- `engine.signer()` returns the validated `anza::crypto::signer::Signer`. The
  engine does not inject the public key into pages.
- `Debug` for `SignMode`, `Signer` and `VerifyKey` prints `<redacted>`
  instead of private key material.

## 2. Signed message

The signature covers the v2 message, exactly as produced by
`Envelope::message()` or `anza::crypto::envelope::message(ts, slot, html, css)`
(both return `Vec<u8>`):

```text
message  = "anza-sig-v2\n" field(ts) field(slot) field(html) field(css)
field(x) = <decimal UTF-8 byte length of x> ":" x "\n"
```

`ts` is written in decimal and an absent `css` is the empty string. For
`ts = 1`, `slot = "a:b"`, `html = "c"`, the message is
`anza-sig-v2\n1:1\n3:a:b\n1:c\n0:\n`. Every field is length-prefixed, so two
different envelopes never share a message. Signatures are lowercase hex, and
`anza::crypto::hex` rejects uppercase, odd-length or non-hex input.

Changing the timestamp, slot, HTML or CSS breaks the signature.

## 3. Verifying envelopes

`anza::verify_envelope` checks a received envelope:

```rust
use anza::{verify_envelope, Envelope, VerifyKey, VerifyOptions};

let envelope: Envelope = serde_json::from_str(&body)?;
let options = VerifyOptions::new("feed", 60); // expected slot, max age in seconds

verify_envelope(VerifyKey::Hmac(&secret), &envelope, &options)?;
// or: verify_envelope(VerifyKey::Ed25519(&public_key), &envelope, &options)?;

// With the engine's own key (HMAC secret or Ed25519 public key):
engine.verify_envelope(&envelope, &options)?;
```

`VerifyOptions` has the public fields `max_age_secs`, `slot`, `skew_secs`
(default 5) and `now` (`Option<u64>`, `None` uses the system clock). The checks
run in this order; the first failure is an `Error::Crypto` with this message:

| Check | Message |
|-------|---------|
| `v` is `2` | `unsupported envelope version` |
| `sig` is present | `envelope is not signed` |
| `sig` is strict lowercase hex | `malformed signature` |
| `ts <= now + skew_secs` | `envelope timestamp is in the future` |
| `now - ts <= max_age_secs` | `envelope expired` |
| `slot` equals the expected slot | `slot mismatch` |
| the signature verifies (constant time) | `bad signature` |

An HMAC secret shorter than 32 bytes or a public key that is not 32 bytes is
`invalid verification key`. `engine.verify_envelope` on an engine without
signing is `signing is off`. The slot check stops a fragment signed for one
slot from being replayed into another.

## 4. Who verifies

The Anza browser library does **not** verify envelopes: it has no envelope or
stream handler. Verify on the server or edge that relays fragments with
`verify_envelope`, or in your own browser code by rebuilding the v2 message
and calling `crypto.subtle.verify` (see [Ed25519](ed25519.md)).
