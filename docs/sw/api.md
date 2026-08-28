# API Reference

Complete reference for the Service Worker toolkit.

## Strategies

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

Posts `cache-update` messages to all controlled clients after a successful background fetch.

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

Only intercepts `request.mode === 'navigate'`.

## Router

### `router()`

Factory. Returns a new `Router` instance.

### `router.register(pattern, strategy)`

| Param | Type | Description |
| ------ | ---- | ----------- |
| `pattern` | string \| URLPatternInit | URL to match |
| `strategy` | object | Any object with `handle(request)` method |

### `router.handle(event)`

Returns `true` if a route matched and `event.respondWith()` was called. Returns `false` otherwise.

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

Converts a `Request` into a structured-cloneable object for IndexedDB storage.

### `deserializeRequest(payload)`

Rebuilds a `Request` from a serialized payload.

### `replayQueue()`

Replays all queued tasks in FIFO order. Removes successful tasks. Retries failures on next call.

```javascript
self.addEventListener('sync', (e) => {
  if (e.tag === 'sync-tasks') {
    e.waitUntil(replayQueue());
  }
});
```

### `requeueFailed(options?)`

Moves tasks that exceeded `maxAttempts` to a dead-letter queue.

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `maxAttempts` | number | `3` | Retry limit before dead-letter |

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
