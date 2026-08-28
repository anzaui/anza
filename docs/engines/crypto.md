# Cryptographic Verification

The cryptographic verification module protects Server-Templated UI (STUI) fragments from tampering, replay attacks, and unauthorized origin injection across reverse proxies, CDNs, and microservices.

## Overview

When dynamic component fragments or real-time streaming updates are sent over the wire, the backend signs the payload across a canonical string:

```text
ts:slot:html
```

- **`ts`**: Unix epoch timestamp in seconds at time of generation.
- **`slot`**: Target dock or slot identifier (e.g. `feed`, `main`).
- **`html`**: Rendered HTML markup of the fragment.

The client runtime validates the signature before mutating the DOM. Stale or tampered payloads are rejected immediately.

## Signing Modes

| Mode | Algorithm | Best For | Proxy / CDN Support | Auth Dependency |
|------|-----------|----------|---------------------|-----------------|
| **`Ed25519`** | Asymmetric Ed25519 | Public pages, multi-tier CDNs, microfrontends | Yes (Bypasses CDN TLS termination) | None |
| **`SessionBound`** | HKDF-SHA256 $\rightarrow$ HMAC-SHA256 | Authenticated personalized streams | Yes | Derived from user session token |
| **`Hmac`** | HMAC-SHA256 | Internal VPC microservices / single origin | Yes | Pre-shared secret |
| **`None`** | No Signature | Local development and testing | Yes | None |

## Asymmetric Ed25519 (Recommended)

Ed25519 uses public-key cryptography. The origin server holds the private key and signs envelopes; clients and edge proxies verify signatures using the public key without needing access to any secrets.

### Backend Setup (Rust)

```rust
use anza::{Setup, SignOptions};

let engine = Setup::new("./templates")
    .with_signing(SignOptions::ed25519_pem_file("keys/origin_private.pem")?)
    .run()?;
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

## Symmetric HMAC-SHA256

For single-origin deployments or internal microservices sharing a secure environment secret:

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

All signed fragments conform to the standard wire envelope:

```json
{
  "slot": "feed",
  "ts": 1724771234,
  "html": "<ui-card class=\"stream-card\"><div slot=\"header\">Live Card</div></ui-card>",
  "sig": "9f83a8b2c4e1d7f005a3e4b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8",
  "css": null
}
```

## Client-Side Verification

When full-page SSR runs, the origin embeds its public key into the document head:

```html
<meta name="anza-key" content="ed25519:e4d9b2c3a1f09876543210fedcba9876543210fedcba9876543210fedcba9876">
```

When receiving envelopes via `listenStream()` or `api.stream()`, the client runtime automatically:

1. Assembles `ts:slot:html` from the incoming envelope.
2. Checks timestamp freshness ($\Delta t \le 60\text{s}$).
3. Verifies `sig` against the key in `<meta name="anza-key">` via `globalThis.crypto.subtle`.
4. Dispatches a `security:tamper` event and drops the fragment if verification fails.
