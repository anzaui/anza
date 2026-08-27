# Crypto

The cryptography module delegates all operations to the browser's `SubtleCrypto` thread pools. Keys are non-extractable by default. IVs are fresh for every encryption.

---

## UUID

```javascript
import { security } from '@anzaui/anza/security';

const id = security.uuid();
```

Returns a cryptographically secure UUID v4 via `crypto.randomUUID()`.

---

## Hash

```javascript
const digest = await security.hash('data');           // SHA-256
const digest = await security.hash(data, 'SHA-512'); // SHA-512
```

Accepts strings or `ArrayBuffer`/`Uint8Array`. Returns an `ArrayBuffer`.

---

## Generate Key

```javascript
const key = await security.generateKey('AES-GCM');
const hmacKey = await security.generateKey('HMAC', ['sign', 'verify']);
```

| Param | Default | Description |
| ------- | --------- | ------------- |
| `algo` | `'AES-GCM'` | `'AES-GCM'` or `'HMAC'` |
| `usages` | `['encrypt', 'decrypt']` | Key usages |
| `extractable` | `false` | Whether the key can be exported |

AES-GCM keys are 256-bit. HMAC keys use SHA-256.

---

## Derive Key (PBKDF2)

```javascript
const key = await security.deriveKey('password', 'unique-salt');
```

Derives an AES-GCM key from a password and salt using PBKDF2 with 600,000 iterations (NIST recommendation).

For tests, reduce iterations:

```javascript
const key = await security.deriveKey('pw', 'salt', 1000); // test only
```

The salt must be unique per password and stored alongside the ciphertext.

---

## Encrypt

```javascript
const cipher = await security.encrypt(key, 'plaintext');
```

Returns an `ArrayBuffer` containing: `[12-byte IV | ciphertext]`.

The IV is randomly generated for every call. Never reuse an IV with the same key.

---

## Decrypt

```javascript
const plainBuf = await security.decrypt(key, cipher);
const plain = new TextDecoder().decode(plainBuf);
```

Expects the combined IV-ciphertext format produced by `encrypt`.

---

## Sign

```javascript
const sig = await security.sign(key, 'message');
```

Algorithm is auto-detected from the key: HMAC or ECDSA.

---

## Verify

```javascript
const valid = await security.verify(key, signature, 'message');
```

Returns `true` if the signature is valid, `false` otherwise.
