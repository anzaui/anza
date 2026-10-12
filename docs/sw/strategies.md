# Strategies

Seven caching strategies for intercepting `fetch` events inside a Service Worker. Each is a class with a `handle(request, event?)` method that returns a Response.

Every strategy **responds first** and writes the cache afterwards. When the
router calls a strategy it passes the `FetchEvent` as the second argument, and
the cache write goes to `event.waitUntil()` so the worker stays alive until it
finishes. Call `handle(request, event)` the same way from your own code.
Strategies never intercept event streams (`Accept: text/event-stream`) or the
dev server's `/hmr` channel.

## What is never cached

A strategy stores a response only if the request is `GET` and the response is OK (2xx). It also skips:

| Condition | Why |
| --------- | --- |
| Response `Cache-Control` contains `no-store` or `private` | The server says the response is not shareable |
| Response `Vary: *` | The response cannot be matched safely |
| Request has an `Authorization` header | Per-user data |
| Request is cross-origin with `credentials: 'include'` | Per-user data (cookies) |

The response is still returned to the page. It is just not written to the cache. Cache entries outlive a logout, so mark per-user API responses `Cache-Control: private` or `no-store`, even if they use cookies on your own origin.

## Clear caches on logout

Same-origin requests sent with cookies are cached unless the response forbids it. Delete the caches when the user logs out, from the page or the worker:

```javascript
import { offline } from '@anzaui/anza/offline';

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
  await offline.queue.clear(); // queued requests keep their headers
}
```

`caches` is the browser's Cache Storage API. `offline.queue.clear()` empties the [Sync](sync.md) queue, whose tasks store request headers in IndexedDB.

## CacheFirst

Tries cache first. Falls back to network on a miss or an expired entry, and stores the network response. If the network fails, an expired entry is still returned.

```javascript
import { CacheFirst } from '@anzaui/anza/sw';

const strategy = new CacheFirst('shell-v1', { ttl: 3600000 });
const response = await strategy.handle(request, event);
```

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `ttl` | number | — | Time-to-live in milliseconds; stored as `x-expires-at` header |

Use this for files whose URL changes when their content changes (content-hashed or `?v=` versioned assets). For unhashed JS/CSS use `StaleRevalidate`, otherwise an old file is served until the cache name changes.

## NetworkFirst

Tries network first. Falls back to cache on failure or timeout.

```javascript
import { NetworkFirst } from '@anzaui/anza/sw';

const strategy = new NetworkFirst('api-v1', { timeout: 4000, ttl: 60000 });
```

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `timeout` | number | `4000` | Milliseconds before giving up on the network |
| `ttl` | number | — | Time-to-live for cached responses |
| `fallbackUrl` | string | — | Offline fallback page URL for navigation requests |

Use this for API endpoints and HTML navigation.

## StaleRevalidate

Returns cache instantly. Refreshes in the background.

```javascript
import { StaleRevalidate } from '@anzaui/anza/sw';

const strategy = new StaleRevalidate('data-v1', { ttl: 300000 });
```

The user sees a cached response immediately. A background fetch updates the cache for the next visit. This is the standard pattern for content that can be slightly stale.

## CacheThenNetwork

Returns cache instantly, fetches in background, and posts the update to all open tabs.

```javascript
import { CacheThenNetwork } from '@anzaui/anza/sw';

const strategy = new CacheThenNetwork('live-v1', { ttl: 60000 });
```

After a successful background fetch, the SW posts `{ type: 'cache-update', url, payload }` to every client. `payload` is the parsed body for `application/json` responses, otherwise `null`. The main thread can listen for this and refresh the UI.

## NetworkOnly

Never uses cache. Direct pass-through to `fetch`.

```javascript
import { NetworkOnly } from '@anzaui/anza/sw';

const strategy = new NetworkOnly();
```

Use this for real-time endpoints that must never be cached: analytics, live data, mutations.

## CacheOnly

Never uses network. Errors if the request is not in cache.

```javascript
import { CacheOnly } from '@anzaui/anza/sw';

const strategy = new CacheOnly('offline-v1');
```

Use this for offline-only pages that were precached during install.

## OfflineFallback

Returns a precached fallback page when a navigation request fails.

```javascript
import { OfflineFallback } from '@anzaui/anza/sw';

const strategy = new OfflineFallback('/offline.html');
```

Only applies to `mode === 'navigate'` requests. For other requests, or when the page is not cached, `handle` throws.

## TTL and Expiry

All strategies that cache responses accept a `ttl` option. The SW stores the response with a custom `x-expires-at` header. `CacheFirst` treats an expired entry as a miss. The other strategies do not check the header when they read from the cache.

Expired entries are not deleted automatically. Use `pruneExpired` or `setupAutoPrune` to clean them up:

```javascript
import { pruneExpired, setupAutoPrune } from '@anzaui/anza/sw';

// One-time cleanup
await pruneExpired('shell-v1');

// Periodic cleanup every 60 seconds
const timer = setupAutoPrune('shell-v1', 60000);
```
