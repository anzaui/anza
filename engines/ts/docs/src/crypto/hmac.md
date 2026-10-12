# HMAC-SHA256

HMAC-SHA256 uses one shared secret for signing and verifying. Use it when every
verifier is trusted with the secret (internal services, your own edge). Never
ship the secret to browsers.

## 1. Secret

The `secret` must be at least 32 bytes (a string counts its UTF-8 bytes). A
missing or shorter secret throws an `AnzaError` with code `CRYPTO` from
`Setup.run()`. A random 32-byte value, hex-encoded, works well.

```typescript
const engine = await new Setup({
  root: './templates',
  signing: { mode: 'hmac', secret: process.env.ANZA_SECRET! },
}).run();
```

## 2. Verifying envelopes

```typescript
import { verifyEnvelope } from '@anzaui/engine';

verifyEnvelope({ mode: 'hmac', secret: process.env.ANZA_SECRET! }, envelope, {
  maxAgeSecs: 60,
  slot: 'feed',
});

// Or with the engine's own secret:
engine.verifyEnvelope(envelope, { maxAgeSecs: 60, slot: 'feed' });
```

Both throw an `AnzaError` with code `CRYPTO` on the first failed check (see
[Cryptographic Verification](index.md)). A verification secret shorter than
32 bytes is `invalid verification key`.

## 3. Low-level API

`src/crypto/hmac.ts`, exported as `crypto.hmac`:

```typescript
sign(secret: string | Uint8Array, data: string | Uint8Array): string;
verify(secret: string | Uint8Array, data: string | Uint8Array, signatureHex: string): boolean;
```

```typescript
import { crypto as anzaCrypto, signatureMessage } from '@anzaui/engine';

const secret = process.env.ANZA_SECRET!;
const message = signatureMessage(1724771200, 'feed', '<ui-alert>OK</ui-alert>');

const sig = anzaCrypto.hmac.sign(secret, message);
console.log(anzaCrypto.hmac.verify(secret, message, sig)); // true
```

`verify` decodes the signature as strict lowercase hex (exactly 64
characters), recomputes the MAC and compares it with `crypto.timingSafeEqual`.
It returns `false` for invalid input (uppercase, wrong length, trailing
characters) instead of throwing.

## 4. Tampering and replay

Any change to the timestamp, slot, HTML or CSS changes the message, so
verification fails:

```typescript
import assert from 'node:assert';

const tampered = signatureMessage(1724771200, 'feed', '<ui-alert>Corrupted</ui-alert>');
const later = signatureMessage(1724779999, 'feed', '<ui-alert>OK</ui-alert>');
assert.equal(anzaCrypto.hmac.verify(secret, tampered, sig), false);
assert.equal(anzaCrypto.hmac.verify(secret, later, sig), false);
```

`crypto.hmac.verify` alone accepts a replayed, unchanged message.
`verifyEnvelope` also rejects old timestamps (`maxAgeSecs`) and envelopes
replayed into another slot.
