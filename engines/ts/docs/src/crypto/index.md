# Cryptographic Verification

TLS protects each hop, but a CDN or proxy that terminates TLS can still change a
response. Signed envelopes let whoever receives a fragment check that it came
from the origin unchanged.

## 1. Signing modes

`SignOptions` (in `src/crypto/signer.ts`), passed to `Setup`:

```typescript
export interface SignOptions {
  mode: 'ed25519' | 'hmac' | 'none';
  secret?: string | Uint8Array;        // HMAC, at least 32 bytes
  privateKey?: Ed25519Key;             // 32-byte seed, 64-char hex seed, PEM or KeyObject
  publicKey?: Ed25519Key;              // optional; must match privateKey
}
```

| Mode | What happens | Verify with |
|---|---|---|
| **`ed25519`** | `sig` = lowercase hex Ed25519 signature, using `privateKey` | `verifyEnvelope({ mode: 'ed25519', publicKey }, …)` |
| **`hmac`** | `sig` = lowercase hex HMAC-SHA256, using `secret` | `verifyEnvelope({ mode: 'hmac', secret }, …)` |
| **`none`** | No `sig` (the default) | — |

Keys are checked once, in `Setup.run()`. Each of these throws an `AnzaError`
with code `CRYPTO` there, so a running engine never sends unsigned envelopes
by accident:

- an HMAC `secret` that is missing or shorter than 32 bytes (a string counts its
  UTF-8 bytes);
- an Ed25519 `privateKey` that is missing or is not a 32-byte seed, a 64-char
  lowercase hex seed, a PEM string or a `KeyObject`;
- a `publicKey` that is given but does not match the private key.

The validated key lives in `engine.signer` (a `Signer`). `engine.signer.publicKey`
returns the raw 32-byte Ed25519 public key to publish to verifiers. `Signer`,
`Setup` and `Engine` never print key material: `inspect` and `JSON.stringify`
show `<redacted>`.

## 2. Signed message

The signature covers the v2 message, returned as a `Buffer` by
`envelope.message()` and `signatureMessage(ts, slot, html, css?)`:

```text
message  = "anza-sig-v2\n" field(ts) field(slot) field(html) field(css)
field(x) = <decimal UTF-8 byte length of x> ":" x "\n"
```

An absent `css` is the empty string. For example, `{ ts: 1, slot: 'a:b', html: 'c' }`
signs `anza-sig-v2\n1:1\n3:a:b\n1:c\n0:\n`. Every field is length-prefixed,
so two different envelopes never share a message. Changing the timestamp, slot,
HTML or CSS breaks the signature. Hex is strict: lowercase, even length,
`0-9a-f` only (`crypto.hex.decode` returns `null` for anything else).

## 3. Verifying an envelope

`verifyEnvelope(key, envelope, options)` checks a received envelope (a parsed
JSON object or an `Envelope`) and throws an `AnzaError` with code `CRYPTO` on
the first failed check. It returns normally when the envelope is valid.

```typescript
import { verifyEnvelope, AnzaError } from '@anzaui/engine';

const envelope = JSON.parse(body);
try {
  verifyEnvelope({ mode: 'ed25519', publicKey }, envelope, { maxAgeSecs: 60, slot: 'feed' });
} catch (err) {
  if (err instanceof AnzaError && err.code === 'CRYPTO') return reject(err.message);
  throw err;
}
```

`key` is `{ mode: 'hmac', secret }` or `{ mode: 'ed25519', publicKey }`.
`options` is `{ maxAgeSecs, slot, skewSecs?, now? }`: `skewSecs` (default 5)
is how far in the future `ts` may be, and `now` (Unix seconds) replaces the
clock in tests. `engine.verifyEnvelope(envelope, options)` does the same with
the engine's own key.

The checks run in this order:

| Check | Message |
|-------|---------|
| `v` is `2` | `unsupported envelope version` |
| `ts`, `slot`, `html`, `css` have the right types | `malformed envelope` |
| `sig` is present | `envelope is not signed` |
| `sig` is strict hex | `malformed signature` |
| `ts <= now + skewSecs` | `envelope timestamp is in the future` |
| `now - ts <= maxAgeSecs` | `envelope expired` |
| `slot` equals `options.slot` | `slot mismatch` |
| the signature verifies (constant-time) | `bad signature` |

A short HMAC secret or a malformed public key is `invalid verification key`.
The slot check stops a fragment signed for one slot from being replayed into
another.

## 4. Who verifies

The engine signs, and `verifyEnvelope` checks envelopes on the server or edge
that relays fragments. The Anza browser library does **not** verify envelopes:
it has no envelope or stream handler. To verify in your own browser code,
rebuild the v2 message and call `crypto.subtle.verify` (see
[Ed25519 Signing](ed25519.md)).
