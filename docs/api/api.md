# API Reference

Complete reference for the API client facade and internal utilities.

## Facade

```javascript
import { api } from '@anzaui/anza/api';
```

### `api.get(url, opts)`

GET request. Returns parsed JSON or text. If the page has a server-rendered `<script id="anza-state" type="application/json">` payload with a key equal to the resolved URL, `get` returns a copy of that value without a network call.

```javascript
const data = await api.get('/user/profile');
```

### `api.post(url, body, opts)`

POST request. Auto-serializes JSON bodies.

```javascript
const result = await api.post('/posts', { title: 'Hello' });
```

### `api.put(url, body, opts)`

PUT request.

### `api.patch(url, body, opts)`

PATCH request.

### `api.delete(url, opts)`

DELETE request.

### `api.stream(url, opts)`

NDJSON async iterable. Calls `fetch` directly: no prefix resolution, pipeline, cache, retry or timeout, and the body is not serialized.

```javascript
for await (const chunk of api.stream('/logs')) {
  console.log(chunk);
}
```

### `api.upload(url, data, opts)`

File upload over `XMLHttpRequest` with progress tracking. Returns a promise resolving to the parsed JSON or text body. No prefix resolution.

```javascript
await api.upload('/upload', formData, { on: { progress: handler } });
```

### `api.on(event, handler, signal)`

Subscribe to telemetry events. Returns disposer. An aborted `signal` removes the listener.

```javascript
const off = api.on('error', handler);
off(); // unsubscribe
```

### `api.emit(event, detail)`

Emit a telemetry event.

```javascript
api.emit('custom:metric', { value: 42 });
```

### `api.prefix.add(name, value)`

Register a URL prefix.

```javascript
api.prefix.add('default', 'https://api.example.com');
```

### `api.prefix.clear()`

Remove all prefixes.

### `api.prefix.resolve(url)`

Return the URL a request would use after prefix resolution.

### `api.state()`

Return a copy of the `__route` entry of the server-rendered `anza-state` payload, or `{}`.

### `api.sync()`

Re-read the `anza-state` payload from the document (for example after a soft navigation replaced it).

### `api.PlatformError`

The error class. Same as the `PlatformError` named export.

`api.cache.*` does not apply prefixes. Pass the resolved URL (see `api.prefix.resolve`).

### `api.cache.get(url)`

Read a cached response. Returns `Response` or `null`.

### `api.cache.set(url, response, ttlMs)`

Cache a response with TTL.

### `api.cache.delete(pattern)`

Delete by exact URL or glob pattern.

### `api.cache.clear()`

Purge entire cache store.

### `api.pipeline.outbound(interceptor)`

Register an outbound interceptor.

### `api.pipeline.inbound(interceptor)`

Register an inbound interceptor.

## Named Exports

```javascript
import {
  api,           // facade object
  pipeline,      // Pipeline instance
  PlatformError, // Error class
  execute,       // fetch executor: timeout, priority, HTTP_ERROR on non-2xx; no prefixes, pipeline, cache or retry
  retry,         // retry utility
  stream,        // streaming function
  createNDJSONTransform, // NDJSON TransformStream
  upload,        // upload function
  prefixes,      // PrefixRegistry instance (same object as api.prefix)
  events,        // ApiEventEmitter instance
  cache,         // ApiCache instance (same object as api.cache)
  sync           // same as api.sync
} from '@anzaui/anza/api';
```

## Request Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `headers` | object | — | Request headers. When set, sent as given (add `Content-Type` yourself) |
| `signal` | AbortSignal | — | Cancellation |
| `timeout` | number | `10000` | Timeout in ms |
| `priority` | string | `'user-visible'` | `'user-blocking'`, `'user-visible'` or `'background'` |
| `retries` | number | `3` | Total attempts |
| `cache` | string | — | `'cache-first'`, `'network-first'` or `'stale-while-revalidate'` |
| `expiry` / `ttl` | number | — | Cache TTL in ms. Takes precedence over `cache` |
| `on` | object | — | Per-request event listeners |

## Telemetry Events

| Event | Payload |
| ------- | --------- |
| `error` | `{ error, requestId }` |
| `failed` | `{ error \| response, requestId }` |
| `timeout` | `{ error, requestId }` |
| `status:xxx` | `{ response, requestId }` |
| `type:json` | `{ response, requestId }` |
| `type:stream` | `{ response, requestId }` |
| `type:text` | `{ response, requestId }` |
| `progress` | `{ loaded, total, percentage, requestId }` |
| `chunk` | `{ chunk, requestId }` |

For `get`, `post`, `put`, `patch` and `delete`, a non-2xx response rejects with `HTTP_ERROR` and fires `error` and `failed` with `{ error, requestId }`. `status:xxx` fires only for 2xx responses there. `upload` and `stream` also fire `status:xxx` for non-2xx responses. Read the status of a failed request from `event.detail.error.context.status`.

## Error Codes

| Code | Context |
| ------ | --------- |
| `HTTP_ERROR` | `{ url, status, method }` |
| `NETWORK_ERROR` | `{ url, method }` |
| `NETWORK_TIMEOUT` | `{ url, method }` |

## Prefix Resolution

```javascript
api.prefix.add('auth', 'https://auth.example.com');

api.get('/auth/login');     // https://auth.example.com/login
api.get('auth/login');      // https://auth.example.com/login
api.get('/user/profile');   // fallback to root/default prefix
api.get('https://x.com/y'); // left as-is
```

## Cache Strategies

| Strategy | Behavior |
| ---------- | ---------- |
| `cache-first` | Cache hit returns immediately; miss fetches and stores |
| `network-first` | Fetch first; on failure return cached; on success store |
| `stale-while-revalidate` | Return cached immediately; revalidate in background |

## Retry Parameters

```javascript
retry(operation, {
  attempts: 3,    // total attempts, including the first
  base: 100,     // starting delay ms
  maxDelay: 3000 // delay cap ms
});
```
