# Troubleshooting

Common problems and their solutions.

## Request returns old cached data

**Cause:** TTL not expired, or no cache invalidation performed.

**Fix:**

```javascript
// Force fresh by clearing the cache entry
await api.cache.delete('/products');

// Or use network-first strategy
await api.get('/products', { cache: 'network-first' });

// Or reduce TTL
await api.get('/products', { expiry: 5000 });
```

## Cache not working

**Cause:** Not a GET request, or Cache API unavailable.

**Fix:** Caching only applies to GET requests. Check the browser supports `caches`:

```javascript
if (typeof caches === 'undefined') {
  console.warn('Cache API unavailable');
}
```

Private browsing modes often disable the Cache API.

## Prefix not resolving

**Cause:** Prefix not registered, or path format mismatch.

**Fix:** Check prefix registration and path format:

```javascript
api.prefix.add('default', 'https://api.example.com');

// Correct
api.get('/user/profile'); // matches root fallback

// Also correct
api.get('user/profile');  // also matches root fallback

// Wrong — fully qualified URL bypasses prefixes
api.get('https://api.example.com/user/profile'); // no prefix matching
```

## Upload progress not firing

**Cause:** Server does not send `Content-Length`, or file is too small.

**Fix:** The progress event requires `event.lengthComputable` from the XMLHttpRequest upload. Ensure the server sets the content length. Small files may complete before any progress events fire.

## Stream stops mid-way

**Cause:** Network drop, or server closed connection.

**Fix:** Wrap in try-catch and handle reconnection:

```javascript
async function* reconnectingStream(url) {
  while (true) {
    try {
      for await (const chunk of api.stream(url)) {
        yield chunk;
      }
      break; // clean end
    } catch (err) {
      console.warn('Stream dropped, reconnecting...');
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}
```

## 401 not triggering handler

**Cause:** Listener registered after the request, or wrong event name.

**Fix:**

```javascript
// Correct — register before the request
api.on('status:401', handler);
await api.get('/protected');

// Also correct — per-request listener
await api.get('/protected', {
  on: { 'status:401': handler }
});
```

Event names are case-sensitive: `'status:401'` not `'Status:401'`.

## Request not timing out

**Cause:** Timeout shorter than expected, or signal already aborted.

**Fix:** Check that the timeout value is in milliseconds:

```javascript
// Correct — 5 seconds
await api.get('/slow', { timeout: 5000 });

// Wrong — 5 milliseconds
await api.get('/slow', { timeout: 5 });
```

## Retry not helping

**Cause:** Error is not transient (4xx client error).

**Fix:** Check the error code. 4xx errors are not retried:

```javascript
try {
  await api.get('/invalid');
} catch (err) {
  console.log(err.code);        // 'HTTP_ERROR'
  console.log(err.context.status); // 404
  console.log(err.recoverable);    // false
}
```

Only `NETWORK_TIMEOUT`, `NETWORK_ERROR`, and 5xx are retried.

## Memory leak with event listeners

**Cause:** Global listeners never removed.

**Fix:** Use disposers or AbortSignal:

```javascript
// Manual cleanup
const off = api.on('error', handler);
off();

// Auto-cleanup
const ctrl = new AbortController();
api.on('error', handler, ctrl.signal);
ctrl.abort(); // removes all listeners bound to this signal
```

## CORS errors

**Cause:** Cross-origin request without proper headers.

**Fix:** The API client does not handle CORS. Ensure the server sends appropriate `Access-Control-Allow-*` headers. For preflight issues, check that custom headers are allowed.

## Still stuck?

Inspect the pipeline:

```javascript
// See registered prefixes
console.log(api.prefix.resolve('/test'));

// Check cache status
console.log(await api.cache.get('/test'));

// Listen to all events for debugging
api.on('error', (e) => console.error('ERROR', e.detail));
api.on('failed', (e) => console.error('FAILED', e.detail));
api.on('status:200', (e) => console.log('OK', e.detail));
```
