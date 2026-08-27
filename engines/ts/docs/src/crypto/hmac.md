# HMAC-SHA256 & Tamper Rejection

HMAC-SHA256 provides symmetric signing for microfrontends, internal services, and direct client-server connections sharing a pre-shared secret.

## 1. TypeScript API Usage

Located in `src/crypto/hmac.ts`:

```typescript
import { crypto as anzaCrypto } from 'anza';

const secret = 'my-secure-cluster-shared-secret-32b';
const payload = '1724771200:feed:<ui-alert>OK</ui-alert>';

// 1. Sign
const sig = anzaCrypto.hmac.sign(secret, payload);

// 2. Constant-time verification
const ok = anzaCrypto.hmac.verify(secret, payload, sig);
console.log('Verified:', ok);
```

## 2. Constant-Time Timing-Safe Verification

To protect against side-channel timing attacks, `verify()` compares signatures in constant time:

```typescript
import * as crypto from 'node:crypto';

export function verify(secret: string | Uint8Array, data: string | Uint8Array, signatureHex: string): boolean {
  try {
    const expected = sign(secret, data);
    const expectedBuf = Buffer.from(expected, 'hex');
    const actualBuf = Buffer.from(signatureHex, 'hex');
    if (expectedBuf.length !== actualBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}
```

## 3. Tamper Rejection Test Guarantees

Any modification to the rendered HTML, target slot identifier, or timestamp causes immediate verification rejection:

```typescript
// Modifying a single character in the HTML
const tamperedPayload = '1724771200:feed:<ui-alert>Corrupted</ui-alert>';
assert.strictEqual(anzaCrypto.hmac.verify(secret, tamperedPayload, sig), false);

// Replay attack with modified timestamp
const stalePayload = '1724779999:feed:<ui-alert>OK</ui-alert>';
assert.strictEqual(anzaCrypto.hmac.verify(secret, stalePayload, sig), false);
```
