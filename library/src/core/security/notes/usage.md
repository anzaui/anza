# Native Security Usage Guide

The Native Security layer provides a unified, zero-dependency browser-native security façade covering Web Cryptography, HTML sanitization, Trusted Types, and the Permissions API. All cryptographic operations delegate to the browser's optimized `SubtleCrypto` thread pools. No third-party libraries are required.

Import from the security entry point:

```javascript
import { security } from '@anzaui/anza/security';
```

Or import individual utilities directly:

```javascript
import { uuid, hash, generateKey, encrypt, decrypt, seal, unseal, sign, verify, sanitize, permission, watchPermission } from '@anzaui/anza/security';
```

---

## 1. Choosing an API

| Need | API | Characteristics |
| --- | --- | --- |
| Unique correlation ID | `uuid()` | Synchronous, `crypto.randomUUID()`, centralized and mockable |
| Content hashing | `hash(data, algo)` | `SubtleCrypto.digest`, returns `ArrayBuffer` |
| AES-GCM encryption | `generateKey`, `encrypt`, `decrypt` | Non-extractable by default, fresh 12-byte IV per encrypt |
| String encryption (base64) | `seal`, `unseal` | Convenience wrappers over `encrypt`/`decrypt` returning base64 strings |
| Password-derived key | `deriveKey(pw, salt, iters)` | PBKDF2 with 600,000 iterations, AES-GCM output |
| Integrity / signing | `sign(key, data)` | HMAC or ECDSA depending on key algorithm |
| Signature verification | `verify(key, sig, data)` | HMAC or ECDSA depending on key algorithm |
| Safe HTML output | `sanitize(html)` | DOMParser fallback, Trusted Types when available |
| Permission query | `permission(name)` | Resolves to `'granted'` \| `'denied'` \| `'prompt'` |
| Permission watcher | `watchPermission(name, fn, signal)` | AbortSignal-gated change listener |

---

## 2. Unique Identifiers

`uuid()` is the centralized source of cryptographically secure UUIDs across all platform modules. Using it instead of calling `crypto.randomUUID()` directly makes the system mockable in tests.

```javascript
import { uuid } from '@anzaui/anza/security';

const id = uuid(); // e.g. "550e8400-e29b-41d4-a716-446655440000"
```

---

## 3. Hashing

Compute a SHA-256 (or other algorithm) digest of any data:

```javascript
import { hash } from '@anzaui/anza/security';

// Hash a string
const digest = await hash('my-payload');
console.log(digest instanceof ArrayBuffer); // true — 32 bytes for SHA-256

// Hash binary data with SHA-512
const buf = new TextEncoder().encode('data');
const sha512 = await hash(buf, 'SHA-512');
```

---

## 4. Symmetric Encryption (AES-GCM)

Generates a non-extractable 256-bit AES-GCM key, encrypts data with a fresh 12-byte IV, and prepends the IV to the ciphertext for portability:

```javascript
import { generateKey, encrypt, decrypt } from '@anzaui/anza/security';

// Generate a key (non-extractable, in-memory only)
const key = await generateKey('AES-GCM');

// Encrypt
const cipher = await encrypt(key, 'Secret message'); // returns ArrayBuffer (IV + ciphertext)

// Decrypt
const plainBuf = await decrypt(key, cipher);
const plain = new TextDecoder().decode(plainBuf);
console.log(plain); // 'Secret message'
```

---

## 5. String Encryption (Base64 Convenience)

`seal` and `unseal` are string-friendly wrappers over `encrypt`/`decrypt` that return and accept base64-encoded payloads. They are ideal for storing encrypted data in JSON, localStorage, or IndexedDB:

```javascript
import { generateKey, seal, unseal } from '@anzaui/anza/security';

const key = await generateKey('AES-GCM');

// Encrypt to a base64 string (IV + ciphertext)
const sealed = await seal(key, 'Secret message');
// e.g. "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/w=="

// Decrypt from base64 string
const plain = await unseal(key, sealed);
console.log(plain); // 'Secret message'
```

The base64 format is portable and can be safely stored as JSON strings:

```javascript
await storage.set('secure:session', sealed, 'idb');
const retrieved = await storage.get('secure:session', 'idb');
const plain = await unseal(key, retrieved);
```

---

## 6. Password-Based Key Derivation (PBKDF2)

Derive an AES-GCM key from a user password and a salt using 600,000 PBKDF2 iterations (NIST-recommended):

```javascript
import { deriveKey, encrypt, decrypt } from '@anzaui/anza/security';

const key = await deriveKey('UserPassword!', 'unique-salt-string');

// Use the derived key normally
const cipher = await encrypt(key, 'protected data');
const buf = await decrypt(key, cipher);
const text = new TextDecoder().decode(buf);
```

> [!IMPORTANT]
> The salt must be unique per user or credential and stored alongside the ciphertext. Never reuse salts across different passwords.

For fast test execution, reduce iterations:

```javascript
const key = await deriveKey('pw', 'salt', 1000); // for tests only
```

---

## 7. Signing and Verification

### HMAC (Symmetric Integrity)

```javascript
import { generateKey, sign, verify } from '@anzaui/anza/security';

const key = await generateKey('HMAC', ['sign', 'verify']);
const data = 'message to protect';

const sig = await sign(key, data);        // ArrayBuffer
const valid = await verify(key, sig, data); // true

const tampered = await verify(key, sig, data + '!'); // false
```

### ECDSA (Asymmetric Signing)

```javascript
// Generate ECDSA key pair using SubtleCrypto directly
const keyPair = await crypto.subtle.generateKey(
  { name: 'ECDSA', namedCurve: 'P-256' },
  false,
  ['sign', 'verify']
);

const data = 'document-to-sign';
const sig = await sign(keyPair.privateKey, data);
const valid = await verify(keyPair.publicKey, sig, data); // true
```

---

## 8. HTML Sanitization (Trusted Types)

`sanitize()` strips all disallowed tags, event handler attributes, and `javascript:` href links. When the browser supports the Trusted Types API, it wraps the output in a named `TrustedHTML` object (`core-sanitize` policy) to satisfy strict CSP directives:

```javascript
import { sanitize } from '@anzaui/anza/security';

// Safe input passes through cleanly
const safe = String(sanitize('<p class="note"><strong>Hello</strong></p>'));
// '<p class="note"><strong>Hello</strong></p>'

// Malicious input is cleaned
const unsafe = String(sanitize('<div><script>alert("xss")</script><img onerror="hack()"></div>'));
// '<div></div>'

// javascript: href is stripped
const link = String(sanitize('<a href="javascript:void(0)">click</a>'));
// '<a>click</a>'
```

> [!NOTE]
> The return type is `TrustedHTML | string`. Use `String(sanitize(...))` when you only need the raw string. Pass the raw result directly to DOM sinks that accept `TrustedHTML` under a Trusted Types policy.
> [!WARNING]
> `sanitize()` is client-side only. It returns the input unchanged when called outside a browser (e.g. Node.js SSR).

---

## 9. Permissions API

### Query Current State

```javascript
import { permission } from '@anzaui/anza/security';

const state = await permission('geolocation');
// 'granted' | 'denied' | 'prompt'

const cam = await permission('camera');
```

Returns `'denied'` safely for any unrecognized or unsupported permission name.

### Watch for Changes

```javascript
import { watchPermission } from '@anzaui/anza/security';

const ctrl = new AbortController();

const dispose = watchPermission('geolocation', (state) => {
  console.log('Permission changed:', state);
}, ctrl.signal);

// Later, tear down cleanly:
ctrl.abort(); // or dispose();
```

> [!TIP]
> Always pass an `AbortSignal` to `watchPermission` inside components or views so the watcher is removed automatically when the component is destroyed.

---

## 9. Integration Patterns

### Lifecycle-Gated Watcher in a Custom Element

```javascript
class MyLocation extends HTMLElement {
  #ctrl = new AbortController();

  connectedCallback() {
    watchPermission('geolocation', (state) => {
      this.dataset.geo = state;
    }, this.#ctrl.signal);
  }

  disconnectedCallback() {
    this.#ctrl.abort();
  }
}
```

### Encrypting and Storing Sensitive Data

```javascript
import { generateKey, seal, unseal } from '@anzaui/anza/security';
import { storage } from '@anzaui/anza/storage';

// Derive and persist key
const key = await generateKey('AES-GCM');
const sealed = await seal(key, JSON.stringify({ token: 'secret' }));
await storage.set('secure:session', sealed, 'idb');

// Retrieve and decrypt
const retrieved = await storage.get('secure:session', 'idb');
const plain = await unseal(key, retrieved);
const { token } = JSON.parse(plain);
```

### Sanitize Before Setting innerHTML

```javascript
import { sanitize } from '@anzaui/anza/security';

function render(el, userHtml) {
  // TrustedHTML satisfies Trusted Types sinks
  el.innerHTML = sanitize(userHtml);
}
```
