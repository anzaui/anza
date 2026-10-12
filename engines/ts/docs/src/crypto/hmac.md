# HMAC-SHA256

HMAC-SHA256 uses one shared secret for signing and verifying. Use it when every
verifier is trusted with the secret (internal services, your own edge). Never
ship the secret to browsers.

## 1. TypeScript API

`src/crypto/hmac.ts`, exported as `crypto.hmac`:

```typescript
sign(secret: string | Uint8Array, data: string | Uint8Array): string;
verify(secret: string | Uint8Array, data: string | Uint8Array, signatureHex: string): boolean;
```

```typescript
import { crypto as anzaCrypto } from '@anzaui/engine';

const secret = 'my-secure-cluster-shared-secret-32b';
const message = '1724771200:feed:<ui-alert>OK</ui-alert>';

const sig = anzaCrypto.hmac.sign(secret, message);
console.log(anzaCrypto.hmac.verify(secret, message, sig)); // true
```

## 2. Constant-time comparison

`verify` recomputes the MAC and compares it with `crypto.timingSafeEqual` after a
length check. It returns `false` for invalid input instead of throwing.

## 3. Tampering

Any change to the timestamp, slot or HTML makes verification fail:

```typescript
import assert from 'node:assert';

assert.equal(anzaCrypto.hmac.verify(secret, '1724771200:feed:<ui-alert>Corrupted</ui-alert>', sig), false);
assert.equal(anzaCrypto.hmac.verify(secret, '1724779999:feed:<ui-alert>OK</ui-alert>', sig), false);
```

Replaying an old, unchanged envelope still verifies; reject old `ts` values
yourself.
