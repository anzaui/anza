# Session Key Derivation via HKDF

When applications stream personalized or user-scoped components, each user session requires an isolated signing key to prevent cross-tenant message forgery.

## 1. HKDF-SHA256 Derivation Architecture

Instead of storing ephemeral signing keys in Redis or server memory, Anza derives deterministic 32-byte stream keys from the user's session token or JWT signature using HMAC-based Extract-and-Expand Key Derivation (HKDF-SHA256, RFC 5869).

```
   User Session Token / JWT Signature
                  │
                  ▼ (IKM: Input Keying Material)
     ┌────────────────────────┐
     │      HKDF-Extract      │ ◄── Master Salt (Configured on Engine)
     └───────────┬────────────┘
                 │ (PRK: Pseudorandom Key)
                 ▼
     ┌────────────────────────┐
     │      HKDF-Expand       │ ◄── Info: "anza-stui-user-stream-v1"
     └───────────┬────────────┘
                 │
                 ▼
      User-Scoped 32-byte Stream Key
```

## 2. TypeScript API Usage

Located in `src/crypto/hkdf.ts`:

```typescript
import { crypto as anzaCrypto } from 'anza';

const sessionToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
const engineSalt = 'anza-cluster-salt-2026';
const info = 'user-live-feed';

const userStreamKey = await anzaCrypto.hkdf.deriveKey(sessionToken, engineSalt, info, 32);
console.log('Derived Key Length:', userStreamKey.length); // 32 bytes
```

### Properties

1. **Stateless**: The server re-derives the stream key on incoming SSE requests without cache lookups or database hits.
2. **Cryptographic Isolation**: Knowing one user's derived key provides zero information about other users' keys.
