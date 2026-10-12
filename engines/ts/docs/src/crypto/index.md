# Cryptographic Verification

TLS protects each hop, but a CDN or proxy that terminates TLS can still change a
response. Signed envelopes let whoever receives a fragment check that it came
from the origin unchanged.

## 1. Signing modes

`SignOptions` (in `src/engine/cache/engine.ts`), passed to `Setup`:

```typescript
export interface SignOptions {
  mode: 'ed25519' | 'hmac' | 'none';
  secret?: string | Uint8Array;
  privateKey?: string | Uint8Array | crypto.KeyObject;
  publicKey?: string | Uint8Array | crypto.KeyObject;
}
```

| Mode | What happens | Verify with |
|---|---|---|
| **`ed25519`** | `sig` = hex Ed25519 signature, using `privateKey` | `crypto.ed25519.verify` with the public key |
| **`hmac`** | `sig` = hex HMAC-SHA256, using `secret` | `crypto.hmac.verify` with the same secret |
| **`none`** | No `sig` (the default) | — |

Notes:

- If `privateKey` (ed25519) or `secret` (hmac) is missing, envelopes are sent
  **unsigned** without an error.
- `publicKey` is stored for your own use; the engine does not inject it into
  pages.

## 2. Signed message

The signature covers `${ts}:${slot}:${html}`, exactly as returned by
`envelope.message()`. Changing the timestamp, slot or HTML breaks the
signature. Checking that `ts` is recent (to reject replays) is up to the
verifier.

## 3. Who verifies

The engine only signs. The Anza browser library does **not** verify envelopes:
it has no envelope or stream handler. Verify on the server or edge that relays
fragments with the `verify` helpers, or in your own browser code with
`crypto.subtle.verify` (see [Ed25519](ed25519.md)).
