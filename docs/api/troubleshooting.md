# Troubleshooting

Common problems and their solutions.

## Request returns old cached data

**Cause:** TTL not expired, no cache invalidation performed, or the URL is in the server-rendered `anza-state` payload.

**Fix:**

```javascript
// Force fresh by clearing the cache entry (cache methods take the resolved URL)
await api.cache.delete(api.prefix.resolve('/products'));

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

The Cache API needs a secure context (HTTPS or localhost).

## Prefix not resolving

**Cause:** Prefix not registered, or path format mismatch.

**Fix:** Check prefix registration and path format:

```javascript
api.prefix.add('default', 'https://api.example.com');

// Correct
api.get('/user/profile'); // matches root fallback

// Also correct
api.get('user/profile');  // also matches root fallback

// Fully qualified URLs are sent unchanged
api.get('https://api.example.com/user/profile');
```

`api.stream`, `api.upload`, `execute` and `api.cache.*` do not apply prefixes. Pass `api.prefix.resolve(path)` to them.

## Upload progress not firing

**Cause:** The browser does not know the total upload size, or the file is small.

**Fix:** Progress is reported only when the XMLHttpRequest upload event has `lengthComputable`. Small files may finish before any progress event fires.

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

**Cause:** For `get`, `post`, `put`, `patch` and `delete`, a non-2xx response becomes an `HTTP_ERROR` before telemetry runs, so `status:401` never fires. Only `error` and `failed` do.

**Fix:** Listen for `error` and check the status:

```javascript
api.on('error', (event) => {
  if (event.detail.error?.context?.status === 401) handler(event);
});
await api.get('/protected');
```

Register the listener before the request. Event names are case-sensitive.

## Request not timing out

**Cause:** The timeout is not in milliseconds, or the request uses `api.stream` or `api.upload`, which have no timeout (use a `signal`).

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
// See where a path resolves
const url = api.prefix.resolve('/test');
console.log(url);

// Check cache status
console.log(await api.cache.get(url));

// Listen to all events for debugging
api.on('error', (e) => console.error('ERROR', e.detail));
api.on('failed', (e) => console.error('FAILED', e.detail));
api.on('status:200', (e) => console.log('OK', e.detail));
```
