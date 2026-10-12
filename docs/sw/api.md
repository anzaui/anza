# API Reference

Complete reference for the Service Worker toolkit.

## Strategies

Every strategy has `handle(request, event?)`. It responds first; with an `event`, the cache write is passed to `event.waitUntil()`.

Only OK responses to `GET` requests are cached. Never cached: responses with `Cache-Control: no-store` or `private`, or `Vary: *`; requests with an `Authorization` header; cross-origin requests with `credentials: 'include'`. See [Strategies](strategies.md#what-is-never-cached).

### `new CacheFirst(cacheName, options)`

| Param | Type | Description |
| ------ | ---- | ----------- |
| `cacheName` | string | Cache storage bucket name |
| `options.ttl` | number | Time-to-live in milliseconds |

### `new NetworkFirst(cacheName, options)`

| Param | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `cacheName` | string | — | Cache storage bucket name |
| `options.timeout` | number | `4000` | Network timeout in ms |
| `options.ttl` | number | — | Cache TTL in ms |
| `options.fallbackUrl` | string | — | Offline fallback page for navigation |

### `new StaleRevalidate(cacheName, options)`

| Param | Type | Description |
| ------ | ---- | ----------- |
| `cacheName` | string | Cache storage bucket name |
| `options.ttl` | number | Cache TTL in ms |

### `new CacheThenNetwork(cacheName, options)`

| Param | Type | Description |
| ------ | ---- | ----------- |
| `cacheName` | string | Cache storage bucket name |
| `options.ttl` | number | Cache TTL in ms |

Posts `{ type: 'cache-update', url, payload }` to all clients after a successful background fetch. `payload` is the parsed JSON body, or `null` for other content types.

### `new NetworkOnly()`

No params. Direct `fetch()` pass-through.

### `new CacheOnly(cacheName)`

| Param | Type | Description |
| ------ | ---- | ----------- |
| `cacheName` | string | Cache storage bucket name |

Throws if the request is not in cache.

### `new OfflineFallback(fallbackUrl)`

| Param | Type | Description |
| ------ | ---- | ----------- |
| `fallbackUrl` | string | Precached fallback page URL |

Only serves the fallback for `request.mode === 'navigate'`. Throws otherwise, or when the fallback is not cached.

## Router

### `router()`

Factory. Returns a new `Router` instance.

### `router.register(pattern, strategy)`

| Param | Type | Description |
| ------ | ---- | ----------- |
| `pattern` | string \| URLPatternInit \| URLPattern | URL to match. Only the worker's own origin, unless an object pattern sets `baseURL`, `protocol`, `hostname` or `port` |
| `strategy` | object | Any object with a `handle(request, event)` method |

### `router.handle(event)`

Responds with the most specific matching route (catch-alls lose to any literal path; ties keep registration order) and passes `event` to the strategy. If the strategy throws, it falls back to `fetch(request)`. Returns `true` if a route matched and `event.respondWith()` was called. Returns `false` otherwise. `GET`/`HEAD` only; event streams and `/hmr` are never intercepted.

## Lifecycle

### `precache(cacheName, urls)`

Pre-caches an array of URLs during the `install` event.

```javascript
await precache('shell-v1', ['/index.html', '/app.js']);
```

### `prefetchFallback(fallbackUrl)`

Pre-caches a single fallback page into a dedicated cache.

```javascript
await prefetchFallback('/offline.html');
```

### `pruneStale(currentCacheName)`

Deletes all caches except `currentCacheName` and `platform-offline-fallback`.

```javascript
await pruneStale('shell-v1');
```

### `claim()`

Calls `self.clients.claim()` to take control of all tabs immediately.

### `enableNavPreload(registration?)`

Enables Navigation Preload on the registration.

## Expiry

### `pruneExpired(cacheName)`

Iterates a cache and deletes entries whose `x-expires-at` header is in the past.

```javascript
await pruneExpired('shell-v1');
```

### `setupAutoPrune(cacheName, intervalMs?)`

Returns a `setInterval` handle that prunes the cache periodically. Default interval: 60000 ms.

```javascript
const timer = setupAutoPrune('shell-v1', 30000);
clearInterval(timer);
```

## Queue and Sync

### `serializeRequest(request)`

Async. Converts a `Request` into `{ url, method, headers, body }` for IndexedDB storage. `body` is an `ArrayBuffer`, or `null` for `GET`/`HEAD`.

### `deserializeRequest(payload)`

Synchronous. Rebuilds a `Request` from a serialized payload.

### `replayQueue()`

Replays queued tasks in FIFO order and skips tasks marked as failed. Removes successful tasks and posts `sync-success` to clients. A non-OK response counts as a failed attempt. A network error counts as a failed attempt and stops the replay (the promise rejects).

```javascript
self.addEventListener('sync', (e) => {
  if (e.tag === 'sync-tasks') {
    e.waitUntil(replayQueue());
  }
});
```

### `requeueFailed(entry, error)`

Called by `replayQueue` after a failed attempt. Increments `entry.retries` and saves the entry. When `retries` reaches `entry.maxRetries` (default 5, set by `offline.queue.push`), it sets `entry.failed = true` and `entry.error`, and posts `{ type: 'sync-failed', id, task, error }` to clients.

| Param | Type | Description |
| ------ | ---- | ----------- |
| `entry` | object | A queue entry from `offline.queue.list()` |
| `error` | Error | The failure; its `message` is stored on the entry |

## Push

### `subscribe(registration?, vapidKey)`

Registers a Web Push subscription.

| Param | Type | Description |
| ------ | ---- | ----------- |
| `registration` | ServiceWorkerRegistration | Optional; defaults to `self.registration` |
| `vapidKey` | string \| Uint8Array | VAPID public key |

### `notify(title, options?, registration?)`

Displays a notification.

| Param | Type | Description |
| ------ | ---- | ----------- |
| `title` | string | Notification title |
| `options` | NotificationOptions | Standard Notification options object |
| `registration` | ServiceWorkerRegistration | Optional; defaults to `self.registration` |
