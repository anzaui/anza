# Requests

The API client exposes five HTTP methods. Each auto-serializes JSON bodies, parses JSON responses, and carries standard options for timeouts, signals, caching, and retries.

## HTTP Methods

```javascript
import { api } from '@anzaui/anza/api';

// GET
const user = await api.get('/user/profile');

// POST with body
const post = await api.post('/posts', { title: 'Hello' });

// PUT
await api.put('/posts/1', { title: 'Updated' });

// PATCH
await api.patch('/posts/1', { title: 'Partial update' });

// DELETE
await api.delete('/posts/1');
```

## Auto-Serialization

When the body is any object other than a `Blob` or `FormData`, it is serialized to JSON and the `Content-Type: application/json` header is set. Strings pass through. Other binary or form types (`ArrayBuffer`, typed arrays, `URLSearchParams`) are also JSON-serialized, so send them with `api.upload` or wrap them in a `Blob`:

```javascript
// Sends JSON body with correct header
api.post('/posts', { title: 'Hello' });

// Does NOT auto-serialize
api.post('/upload', formData); // FormData passes through as-is
api.post('/upload', blob);     // Blob passes through as-is
```

## Response Parsing

The response is parsed based on `Content-Type`:

| Content-Type | Returned As |
| ------------- | ----------- |
| `application/json` | Parsed JSON object |
| Anything else | Raw text string |

To get the `Response` object, use the lower-level `execute` export. It applies the timeout and priority and throws `HTTP_ERROR` on non-2xx, but skips prefixes, the pipeline, caching, retries and telemetry:

```javascript
import { execute } from '@anzaui/anza/api';
const response = await execute({ url: '/image', method: 'GET' });
const blob = await response.blob();
```

## Request Options

All methods accept an options object:

```javascript
await api.get('/user/profile', {
  headers: { 'X-Custom': 'value' },
  signal: controller.signal,
  timeout: 15000,
  priority: 'user-blocking',
  retries: 5,
  cache: 'network-first',
  on: { 'status:200': handler }
});
```

| Option | Type | Default | Description |
| -------- | ------ | --------- | ------------- |
| `headers` | object | `{}` | Additional request headers |
| `signal` | AbortSignal | — | Cancel the request |
| `timeout` | number | `10000` | Timeout in milliseconds |
| `priority` | string | `'user-visible'` | Browser task priority (`user-blocking`, `user-visible`, `background`) |
| `retries` | number | `3` | Total attempts for transient failures |
| `cache` | string | — | Cache strategy (`cache-first`, `network-first`, `stale-while-revalidate`) |
| `expiry` / `ttl` | number | — | Cache TTL in milliseconds. Takes precedence over `cache` |
| `on` | object | — | Per-request event listeners |

## Timeouts

Requests time out after 10 seconds by default. Change per request:

```javascript
await api.get('/slow-endpoint', { timeout: 30000 });
```

When a timeout fires, the request aborts and a `PlatformError` with code `NETWORK_TIMEOUT` is thrown.

## Abort Signals

Pass an `AbortSignal` to cancel a request:

```javascript
const controller = new AbortController();

api.get('/endpoint', { signal: controller.signal });

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);
```

The API client composes the user signal with its internal timeout signal using `AbortSignal.any` when available, falling back to manual composition.

## Browser Task Priority

The API client uses `scheduler.postTask` when available to schedule the fetch at the requested priority:

| Priority | Use Case |
| ---------- | ---------- |
| `user-blocking` | Critical path data needed immediately |
| `user-visible` | Standard API calls |
| `background` | Prefetch, analytics, non-urgent sync |

```javascript
await api.get('/critical-data', { priority: 'user-blocking' });
```

## Headers

Pass extra headers with `headers`:

```javascript
await api.get('/protected', {
  headers: { Authorization: `Bearer ${token}` }
});
```

Without a `headers` option, the client sets `Content-Type: application/json` for object bodies. If you pass `headers`, your object is sent as given, so include `Content-Type` yourself:

```javascript
await api.post('/posts', { title: 'Hello' }, {
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
});
```
