# Advanced Topics

Internals, extension points, and edge cases for developers building on or extending the API client.

## Retry Internals

The retry function uses exponential backoff with full jitter:

```javascript
delay = random(0, min(maxDelay, base * 2^attempt))
```

| Parameter | Default | Description |
| ----------- | --------- | ------------- |
| `attempts` | 3 | Maximum retry attempts |
| `base` | 100ms | Starting delay |
| `maxDelay` | 3000ms | Cap on delay |

Retries apply only to transient failures:

- `NETWORK_TIMEOUT`
- `NETWORK_ERROR`
- `HTTP_ERROR` with status >= 500

4xx errors and aborted requests fail immediately.

The retry loop respects `AbortSignal`. If the signal aborts during backoff, the wait is cancelled and a `NETWORK_ERROR` is thrown.

## AbortSignal Composition

The API client composes its internal timeout signal with any user-provided signal:

```javascript
// Modern path (AbortSignal.any)
const activeSignal = AbortSignal.any([timeoutSignal, userSignal]);

// Fallback path (manual listeners)
userSignal.addEventListener('abort', () => timeoutSignal.abort());
```

This means either the timeout firing or the user calling `abort()` will cancel the request.

## Browser Scheduler Integration

When `scheduler.postTask` is available, the fetch is scheduled at the requested priority:

```javascript
scheduler.postTask(runFetch, { priority: 'user-visible', signal });
```

This improves Interaction to Next Paint (INP) by deferring non-critical requests.

When `scheduler.postTask` is unavailable, the fetch runs immediately.

## Pipeline Short-Circuiting

An outbound interceptor can return a `Response` to skip the network entirely:

```javascript
api.pipeline.outbound((descriptor) => {
  if (isOffline()) {
    return new Response(JSON.stringify({ offline: true }));
  }
  return descriptor;
});
```

The response still runs through the inbound pipeline, so telemetry events fire normally.

## Request IDs

Every request gets a unique ID:

```javascript
const requestId = crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36);
```

This ID scopes per-request event listeners and correlates telemetry.

## Cache Internals

The cache layer uses the browser Cache API directly:

```javascript
const storage = await caches.open('platform-api-cache');
```

TTL is implemented via an `x-expires-at` header on cached responses. When reading, expired entries are deleted and `null` is returned.

Glob invalidation converts patterns to regex and iterates all cache keys:

```javascript
const regex = globToRegex('*/user/*');
for (const req of await store.keys()) {
  if (regex.test(req.url)) await store.delete(req);
}
```

## NDJSON Parsing

The `createNDJSONTransform` stream uses a line buffer to handle partial chunks:

```javascript
let buffer = '';
// On each chunk:
buffer += chunk;
const lines = buffer.split('\n');
buffer = lines.pop(); // keep trailing fragment
for (const line of lines) parseJSON(line);
```

This guarantees correct parsing even when chunks break mid-line.

## SSR Considerations

The API client checks `typeof caches !== 'undefined'` before using the Cache API. On the server:

- Caching is a no-op
- `fetch` works normally (via polyfill if needed)
- Events fire normally
- Uploads require XMLHttpRequest polyfill

For server-side rendering, register prefixes during build or server startup, then make requests as normal.
