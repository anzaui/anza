# Troubleshooting

Common problems and their solutions.

## SubtleCrypto not available

**Error:** `crypto.subtle is undefined`

**Cause:** Running in a non-secure context (HTTP, not HTTPS) or in Node without polyfill.

**Fix:** SubtleCrypto requires a secure context. Use HTTPS in production. In Node, use `crypto.webcrypto`:

```javascript
if (typeof crypto === 'undefined') {
  globalThis.crypto = require('crypto').webcrypto;
}
```

## Decrypt fails with bad data

**Cause:** Wrong key, corrupted ciphertext, or reused IV.

**Fix:** Ensure you use the same key for encrypt and decrypt. Check that the ciphertext was not truncated or modified. Never reuse an IV with the same key — always generate a fresh key for new data or use `seal`/`unseal`.

## Sanitize returns empty string

**Cause:** Input contained no allowed tags.

**Fix:** Check the allowed tag list in [sanitize.md](sanitize.md). Plain text is preserved. Only disallowed tags are stripped:

```javascript
const safe = String(sanitize('<script>alert(1)</script>Hello'));
// 'Hello' — script removed, text kept
```

## Trusted Types policy already registered

**Warning:** `Trusted Types policy "core-sanitize" registration failed`

**Cause:** Another script registered the same policy name.

**Fix:** This is non-fatal. The sanitizer falls back to string output. If you need a custom policy name, use the native `TrustedTypes.createPolicy` directly.

## Permission query returns denied

**Cause:** Permissions API unavailable, or the permission name is unsupported.

**Fix:** Check browser support. Not all permissions work in all browsers:

```javascript
const state = await permission('camera');
if (state === 'denied') {
  // Check if the API exists at all
  if (!navigator.permissions) {
    console.warn('Permissions API not supported');
  }
}
```

## WatchPermission not firing

**Cause:** The permission state does not change during the session, or the watcher was removed.

**Fix:** Most permissions do not emit `change` events in all browsers. Test by manually changing the site permission in browser settings:

```javascript
watchPermission('geolocation', (state) => {
  console.log('Changed to:', state);
});

// Go to browser settings and toggle the permission
```

## Still stuck?

Inspect the crypto state:

```javascript
console.log('SubtleCrypto:', !!crypto?.subtle);
console.log('RandomUUID:', !!crypto?.randomUUID);
console.log('Trusted Types:', !!window?.trustedTypes);
console.log('Permissions:', !!navigator?.permissions);
```
