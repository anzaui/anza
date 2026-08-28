# API Reference

Complete reference for the API client facade and internal utilities.

## Facade

```javascript
import { api } from '@anzaui/anza/api';
```

### `api.get(url, opts)`

GET request. Returns parsed JSON or text.

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

NDJSON async iterable.

```javascript
for await (const chunk of api.stream('/logs')) { ... }
```

### `api.upload(url, data, opts)`

File upload with progress tracking. Returns promise resolving to response data.

```javascript
await api.upload('/upload', formData, { on: { progress: handler } });
```

### `api.on(event, handler, signal)`

Subscribe to telemetry events. Returns disposer.

```javascript
const off = api.on('status:401', handler);
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
  pipeline,    // Pipeline instance
  PlatformError, // Error class
  execute,       // raw fetch executor
  retry,         // retry utility
  stream,        // streaming function
  createNDJSONTransform, // NDJSON TransformStream
  upload,        // upload function
  prefixes,      // PrefixRegistry instance
  events,        // ApiEventEmitter instance
  cache          // ApiCache instance
} from '@anzaui/anza/api';
```

## Request Options

```javascript
{
  headers: object,           // additional headers
  signal: AbortSignal,       // cancellation
  timeout: number,         // ms (default 10000)
  priority: string,          // 'user-blocking' | 'user-visible' | 'background'
  retries: number,         // attempts (default 3)
  cache: string,           // 'cache-first' | 'network-first' | 'stale-while-revalidate'
  expiry: number,          // TTL in ms (alias: ttl)
  on: object               // per-request event listeners
}
```

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
  attempts: 3,    // max attempts
  base: 100,     // starting delay ms
  maxDelay: 3000 // delay cap ms
});
```
