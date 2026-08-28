# API Reference

Complete reference for the security facade and individual functions.

## Facade

```javascript
import { security } from '@anzaui/anza/security';
```

### `security.uuid()`

Returns a cryptographically secure UUID string.

### `security.hash(data, algo)`

Returns `Promise<ArrayBuffer>`.

| Param | Default | Description |
| ------- | --------- | ------------- |
| `data` | required | String or ArrayBuffer to hash |
| `algo` | `'SHA-256'` | Algorithm string |

### `security.generateKey(algo, usages, extractable)`

Returns `Promise<CryptoKey>`.

| Param | Default | Description |
| ------- | --------- | ------------- |
| `algo` | `'AES-GCM'` | `'AES-GCM'` or `'HMAC'` |
| `usages` | `['encrypt', 'decrypt']` | Key usages |
| `extractable` | `false` | Whether the key can be exported |

### `security.deriveKey(password, salt, iterations)`

Returns `Promise<CryptoKey>` (AES-GCM 256-bit).

| Param | Default | Description |
| ------- | --------- | ------------- |
| `password` | required | Password string |
| `salt` | required | Salt string or ArrayBuffer |
| `iterations` | `600000` | PBKDF2 iterations |

### `security.encrypt(key, data)`

Returns `Promise<ArrayBuffer>` (IV + ciphertext).

### `security.decrypt(key, combinedData)`

Returns `Promise<ArrayBuffer>` (plaintext).

### `security.seal(key, text)`

Returns `Promise<string>` (base64).

### `security.unseal(key, b64)`

Returns `Promise<string>` (plaintext).

### `security.sign(key, data)`

Returns `Promise<ArrayBuffer>`.

### `security.verify(key, signature, data)`

Returns `Promise<boolean>`.

### `security.sanitize(html, config)`

Returns `TrustedHTML | string`.

### `security.permission(name)`

Returns `Promise<'granted' | 'denied' | 'prompt'>`.

### `security.watchPermission(name, fn, signal)`

Returns disposer function.

## Named Exports

```javascript
import {
  uuid, hash, generateKey, deriveKey,
  encrypt, decrypt, seal, unseal,
  sign, verify, sanitize,
  permission, watchPermission
} from '@anzaui/anza/security';
```

## Return Types

| Function | Returns |
| ---------- | --------- |
| `uuid()` | `string` |
| `hash()` | `Promise<ArrayBuffer>` |
| `generateKey()` | `Promise<CryptoKey>` |
| `deriveKey()` | `Promise<CryptoKey>` |
| `encrypt()` | `Promise<ArrayBuffer>` |
| `decrypt()` | `Promise<ArrayBuffer>` |
| `seal()` | `Promise<string>` |
| `unseal()` | `Promise<string>` |
| `sign()` | `Promise<ArrayBuffer>` |
| `verify()` | `Promise<boolean>` |
| `sanitize()` | `TrustedHTML \| string` |
| `permission()` | `Promise<string>` |
| `watchPermission()` | `() => void` |
