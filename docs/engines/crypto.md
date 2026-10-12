---
seo_title: "Cryptographic Verification — Anza"
description: "Asymmetric Ed25519 origin signing, HMAC-SHA256, and HKDF session stream keys for STUI security."
---

# Cryptographic Verification

The cryptographic verification module protects Server-Templated UI (STUI) fragments from tampering, replay attacks, and unauthorized origin injection across reverse proxies, CDNs, and microservices.

## Overview

When dynamic component fragments or real-time streaming updates are sent over the wire, the backend signs a length-prefixed message built from the envelope (signature v2):

```text
message  = "anza-sig-v2\n" field(ts) field(slot) field(html) field(css)
field(x) = <decimal UTF-8 byte length of x> ":" x "\n"
```

- **`ts`**: Unix time in seconds when the fragment was rendered, written in decimal.
- **`slot`**: Target dock or slot identifier (e.g. `feed`, `main`).
- **`html`**: Rendered HTML markup of the fragment.
- **`css`**: Fragment CSS. An absent `css` is the empty string.

For example, `{ts: 1, slot: "a:b", html: "c"}` signs
`anza-sig-v2\n1:1\n3:a:b\n1:c\n0:\n`. Every field is length-prefixed, so two
different envelopes never share a message. Version 1 joined the fields with
colons, so slot `a:b` with html `c` and slot `a` with html `b:c` produced the
same bytes. Version 1 is no longer produced or accepted.

The signature is lowercase hex in the envelope's `sig` field. Whoever receives the envelope (an edge worker, a proxy, another service) checks it with `verify_envelope`, which also checks the version, freshness and slot. The browser library does not verify envelopes for you; see [Client-Side Verification](#client-side-verification). The exact rules are in the [Engine Contract](contract.md).

Each engine also exposes the message builder: Rust `anza::crypto::envelope::message(ts, slot, html, css)`, TS `signatureMessage(ts, slot, html, css?)`, Python `signature_message(ts, slot, html, css=None)`, and `envelope.message()` on every envelope.

## Signing Modes

| Mode | Algorithm | Key | `sig` | Best For |
|------|-----------|-----|-------|----------|
| **`ed25519`** | Ed25519 (RFC 8032) | 32-byte private seed; optional 32-byte public key | 128 hex characters | Public pages, multi-tier CDNs, microfrontends |
| **`hmac`** | HMAC-SHA256 | Secret of at least 32 bytes | 64 hex characters | Internal services and single origins sharing a secret |
| **`none`** | No signature | — | absent | Local development and testing |

## Key Validation

Keys are checked once, when `Setup` runs. A bad key is a `CRYPTO` error at
setup. A running engine never sends an unsigned envelope because of a bad key,
and never fails at render time because of one. Setup rejects:

- an HMAC secret that is missing or shorter than 32 bytes (a string counts its UTF-8 bytes);
- an Ed25519 private key that is not a 32-byte seed (TS also takes 64-char lowercase hex, PEM or a `KeyObject`; Python also takes 64-char lowercase hex or an `Ed25519PrivateKey`);
- an Ed25519 public key that is given but does not match the private key;
- in Rust, a key file passed to `Setup::ed25519` that cannot be read.

Hex is strict everywhere: lowercase, even length, `0-9a-f` only. Rust
`Debug`, TS `inspect`/`JSON.stringify` and Python `repr` print `<redacted>`
instead of key material. The validated key is available as `engine.signer()`
(Rust) or `engine.signer` (TS, Python).

## Asymmetric Ed25519 (Recommended)

Ed25519 uses public-key cryptography. The origin server holds the private key and signs envelopes. Edge proxies and other services verify signatures with the public key without needing access to any secret.

### Backend Setup (Rust)

```rust
use anza::Setup;

// Raw 32-byte private seed and public key files; a missing file is an error.
let mut setup = Setup::new("./templates");
setup.signing = Setup::ed25519("keys/origin.key", "keys/origin.pub")?;
let engine = setup.run()?;
```

### Backend Setup (TypeScript)

```typescript
import { Setup } from '@anzaui/engine';
import { readFileSync } from 'node:fs';

const engine = await new Setup({
  root: './templates',
  signing: {
    mode: 'ed25519',
    privateKey: readFileSync('keys/origin_private.pem', 'utf8'),
  },
}).run();
```

### Backend Setup (Python)

```python
from anza import Setup, SignOptions

engine = Setup(
    root="./templates",
    signing=SignOptions(mode="ed25519", private_key=open("keys/origin.key", "rb").read()),
).run()
```

## Symmetric HMAC-SHA256

For single-origin deployments or internal microservices sharing a secret of at least 32 bytes:

```typescript
import { Setup } from '@anzaui/engine';

const engine = await new Setup({
  root: './templates',
  signing: {
    mode: 'hmac',
    secret: process.env.STUI_SIGNING_SECRET,
  },
}).run();
```

## Wire Envelope Format

All fragments use the v2 wire envelope. It is serialized as compact JSON with
`v` first, and `sig` and `css` are left out when absent:

```json
{"v":2,"slot":"feed","ts":1724771234,"html":"<ui-card class=\"stream-card\"><div slot=\"header\">Live Card</div></ui-card>","sig":"9f83a8b2…c7d8"}
```

| Field | Type | Meaning |
|-------|------|---------|
| `v` | integer | Wire-format version. Always `2`. |
| `slot` | string | Target slot or dock. |
| `ts` | integer | Unix time in seconds when the fragment was rendered. |
| `html` | string | Rendered markup. |
| `sig` | string, optional | Lowercase hex signature. Absent when signing is off. |
| `css` | string, optional | Fragment CSS. Absent when there is none. |

## Verifying Envelopes

`verify_envelope` takes a key, a received envelope, the maximum age in seconds
and the expected slot. `skew_secs` (default 5) allows for clocks that run
slightly ahead, and `now` overrides the clock. The checks run in this order,
and the first failure is a `CRYPTO` error with this message:

| Check | Message |
|-------|---------|
| `v` is `2` | `unsupported envelope version` |
| fields have the right types (TS, Python) | `malformed envelope` |
| `sig` is present | `envelope is not signed` |
| `sig` is strict hex | `malformed signature` |
| `ts` is at most `skew_secs` in the future | `envelope timestamp is in the future` |
| `ts` is at most `max_age_secs` old | `envelope expired` |
| `slot` equals the expected slot | `slot mismatch` |
| the signature verifies (constant-time) | `bad signature` |

A short HMAC secret or a malformed public key is `invalid verification key`.
The slot check stops a fragment signed for one slot from being replayed into
another one. `Engine.verify_envelope` runs the same checks with the engine's
own key.

### Rust

```rust
use anza::{verify_envelope, Envelope, VerifyKey, VerifyOptions};

let envelope: Envelope = serde_json::from_str(&body)?;
verify_envelope(VerifyKey::Ed25519(&public_key), &envelope, &VerifyOptions::new("feed", 60))?;
// HMAC: VerifyKey::Hmac(&secret). With the engine's own key:
engine.verify_envelope(&envelope, &VerifyOptions::new("feed", 60))?;
```

### TypeScript

```typescript
import { verifyEnvelope } from '@anzaui/engine';

// Throws AnzaError with code CRYPTO.
verifyEnvelope({ mode: 'ed25519', publicKey }, JSON.parse(body), { maxAgeSecs: 60, slot: 'feed' });
verifyEnvelope({ mode: 'hmac', secret }, JSON.parse(body), { maxAgeSecs: 60, slot: 'feed' });
engine.verifyEnvelope(JSON.parse(body), { maxAgeSecs: 60, slot: 'feed' });
```

### Python

```python
import json
from anza import AnzaError, VerifyKey, verify_envelope

try:
    verify_envelope(VerifyKey.ed25519(public_key), json.loads(body), max_age_secs=60, slot="feed")
except AnzaError as err:
    print(err.code, err)  # CRYPTO [Anza:CRYPTO] envelope expired

# HMAC: VerifyKey.hmac(secret). With the engine's own key:
engine.verify_envelope(json.loads(body), max_age_secs=60, slot="feed")
```

## Client-Side Verification

The engines do not inject a key into pages. If you want browser-side checks, publish your public key in the document head yourself:

```html
<meta name="anza-key" content="ed25519:e4d9b2c3a1f09876543210fedcba9876543210fedcba9876543210fedcba9876">
```

The browser library still does **not** verify envelopes: there is no
built-in stream listener, and `api.stream()` only parses JSON. Verification is
done with `verify_envelope` (see [Verifying Envelopes](#verifying-envelopes)),
typically on the server or edge that relays fragments. To verify in the
browser, check that `v` is `2` and that `ts` is fresh and `slot` is the one you
expect, rebuild the v2 message (`anza-sig-v2\n` followed by the
length-prefixed `ts`, `slot`, `html` and `css` fields, with lengths counted in
UTF-8 bytes) and call `crypto.subtle.verify('Ed25519', key, sig, message)`
with the public key from `<meta name="anza-key">`. `verify()` from
`@anzaui/anza/security` covers HMAC and ECDSA keys only.
