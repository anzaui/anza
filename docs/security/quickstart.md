# Quick Start

Get working with encryption and sanitization in five minutes.

---

## 1. Generate a UUID

```javascript
import { security } from '@anzaui/anza/security';

const id = security.uuid(); // e.g. "550e8400-e29b-41d4-a716-446655440000"
```

---

## 2. Hash Data

```javascript
const digest = await security.hash('my-payload');
// Returns ArrayBuffer — 32 bytes for SHA-256

const sha512 = await security.hash('data', 'SHA-512');
```

---

## 3. Encrypt and Decrypt

```javascript
// Generate a non-extractable AES-GCM key
const key = await security.generateKey('AES-GCM');

// Encrypt
const cipher = await security.encrypt(key, 'Secret message');

// Decrypt
const plainBuf = await security.decrypt(key, cipher);
const plain = new TextDecoder().decode(plainBuf);
```

Each encryption generates a fresh 12-byte IV and prepends it to the ciphertext.

---

## 4. Seal and Unseal (Base64)

For storing encrypted data in JSON or localStorage:

```javascript
const key = await security.generateKey('AES-GCM');

const sealed = await security.seal(key, 'Secret message');
// base64 string, ready for JSON

const plain = await security.unseal(key, sealed);
```

---

## 5. Sanitize HTML

```javascript
const safe = String(security.sanitize('<p><script>alert(1)</script>Hello</p>'));
// '<p>Hello</p>'

const link = String(security.sanitize('<a href="javascript:void(0)">click</a>'));
// '<a>click</a>' — javascript: href stripped
```

---

## 6. Query Permission

```javascript
const state = await security.permission('geolocation');
// 'granted' | 'denied' | 'prompt'
```

---

## Complete Working Example

```javascript
import { security } from '@anzaui/anza/security';

// Secure session storage
async function storeSession(data) {
  const key = await security.generateKey('AES-GCM');
  const sealed = await security.seal(key, JSON.stringify(data));
  localStorage.setItem('session', sealed);
  return key; // keep in memory, never store
}

// Restore session
async function restoreSession(key) {
  const sealed = localStorage.getItem('session');
  if (!sealed) return null;
  const plain = await security.unseal(key, sealed);
  return JSON.parse(plain);
}

// Safe HTML rendering
function renderComment(html) {
  return String(security.sanitize(html));
}
```
