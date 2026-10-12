# Key Derivation with HKDF

The package includes an HKDF-SHA256 helper (RFC 5869) for deriving per-session
keys, for example a per-user HMAC secret from a session token.

> `mode: 'session'` does not use it yet: that mode adds no signature. To sign per
> session today, derive a key and pass it to `crypto.hmac.sign` yourself.

## 1. TypeScript API

`src/crypto/hkdf.ts`, exported as `crypto.hkdf`:

```typescript
deriveKey(
  ikm: string | Uint8Array,
  salt?: string | Uint8Array,              // default: empty
  info: string | Uint8Array = 'anza-stui-session-v1',
  keylen = 32,
): Promise<Buffer>;
```

```typescript
import { crypto as anzaCrypto } from '@anzaui/engine';

const sessionToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
const userKey = await anzaCrypto.hkdf.deriveKey(sessionToken, 'anza-cluster-salt-2026', 'user-live-feed', 32);

const sig = anzaCrypto.hmac.sign(userKey, '1724771200:feed:<ui-card>Hi</ui-card>');
```

## 2. Properties

1. **Stateless**: the same inputs always give the same key, so the server can
   re-derive it per request.
2. **Isolation**: knowing one derived key does not reveal the input key or other
   derived keys.
