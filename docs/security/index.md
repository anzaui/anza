# Security

The Anza security layer provides browser-native cryptography, HTML sanitization, Trusted Types integration, and Permissions API querying. Everything delegates to the browser's `SubtleCrypto` and `crypto` thread pools — no third-party libraries required.

## What You Get

- **Cryptography** — AES-GCM encryption, PBKDF2 key derivation, HMAC/ECDSA signing and verification, SHA hashing, UUID generation
- **String encryption** — `seal` and `unseal` for storing encrypted data as base64 in JSON or localStorage
- **HTML sanitization** — XSS-safe HTML with Trusted Types policy when available
- **Permissions** — query and watch browser permission states (geolocation, camera, etc.)

## Package

```javascript
import { security } from '@anzaui/anza/security';
```

Or individual functions:

```javascript
import { uuid, hash, encrypt, decrypt, seal, unseal, sanitize, permission } from '@anzaui/anza/security';
```

## File Map

| File | What It Covers |
| ----- | --------------- |
| [quickstart.md](quickstart.md) | Your first encrypt and sanitize in five minutes |
| [crypto.md](crypto.md) | AES-GCM, PBKDF2, HMAC, ECDSA, hash, UUID |
| [seal.md](seal.md) | String encryption with base64 storage |
| [sanitize.md](sanitize.md) | HTML sanitization and Trusted Types |
| [permissions.md](permissions.md) | Query and watch browser permissions |
| [api.md](api.md) | Complete API reference |
| [troubleshooting.md](troubleshooting.md) | Common problems and how to fix them |

## One-File Example

```javascript
import { security } from '@anzaui/anza/security';

// Hash
const digest = await security.hash('password123');

// Encrypt
const key = await security.generateKey('AES-GCM');
const sealed = await security.seal(key, 'Secret data');

// Decrypt later
const plain = await security.unseal(key, sealed);

// Sanitize HTML
const safe = String(security.sanitize('<p><script>alert(1)</script>Hello</p>'));
// '<p>Hello</p>'

// Query permission
const state = await security.permission('geolocation');
```

## Next Steps

- New to security? Start with [quickstart.md](quickstart.md).
- Building encryption? Read [crypto.md](crypto.md) and [seal.md](seal.md).
- Rendering user HTML? [sanitize.md](sanitize.md).
- Need device permissions? [permissions.md](permissions.md).
- Prefer a single reference page? [api.md](api.md).
