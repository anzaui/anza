# Seal and Unseal

`seal` and `unseal` are string-friendly wrappers over `encrypt` and `decrypt`. They return and accept base64-encoded payloads, making them ideal for JSON storage, localStorage, and IndexedDB.

---

## Seal

```javascript
import { security } from '@anzaui/anza/security';

const key = await security.generateKey('AES-GCM');
const sealed = await security.seal(key, 'Secret message');
```

Returns a base64 string containing the IV + ciphertext.

---

## Unseal

```javascript
const plain = await security.unseal(key, sealed);
console.log(plain); // 'Secret message'
```

---

## Storage Example

```javascript
async function storeSecure(key, id, data) {
  const sealed = await security.seal(key, JSON.stringify(data));
  localStorage.setItem(`secure:${id}`, sealed);
}

async function loadSecure(key, id) {
  const sealed = localStorage.getItem(`secure:${id}`);
  if (!sealed) return null;
  const plain = await security.unseal(key, sealed);
  return JSON.parse(plain);
}
```

---

## Password-Based Encryption

```javascript
const key = await security.deriveKey('UserPassword!', 'unique-salt');
const sealed = await security.seal(key, 'Sensitive data');

// Store salt + sealed together
const bundle = { salt: 'unique-salt', data: sealed };
```

The salt must be unique per user and stored alongside the ciphertext. Never reuse salts across different passwords.
