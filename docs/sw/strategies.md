# Strategies

Seven caching strategies for intercepting `fetch` events inside a Service Worker. Each is a class with a `handle(request)` method that returns a Response.

---

## CacheFirst

Tries cache first. Falls back to network on miss. Stores the network response in cache.

```javascript
import { CacheFirst } from '@anzaui/anza/sw';

const strategy = new CacheFirst('shell-v1', { ttl: 3600000 });
const response = await strategy.handle(request);
```

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `ttl` | number | — | Time-to-live in milliseconds; stored as `x-expires-at` header |

Use this for static assets: JS, CSS, fonts, images.

---

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

---

## StaleRevalidate

Returns cache instantly. Refreshes in the background.

```javascript
import { StaleRevalidate } from '@anzaui/anza/sw';

const strategy = new StaleRevalidate('data-v1', { ttl: 300000 });
```

The user sees a cached response immediately. A background fetch updates the cache for the next visit. This is the standard pattern for content that can be slightly stale.

---

## CacheThenNetwork

Returns cache instantly, fetches in background, and posts the update to all open tabs.

```javascript
import { CacheThenNetwork } from '@anzaui/anza/sw';

const strategy = new CacheThenNetwork('live-v1', { ttl: 60000 });
```

After the background fetch completes, the SW sends a `cache-update` message to every controlled client with the new JSON payload. The main thread can listen for this and refresh the UI.

---

## NetworkOnly

Never uses cache. Direct pass-through to `fetch`.

```javascript
import { NetworkOnly } from '@anzaui/anza/sw';

const strategy = new NetworkOnly();
```

Use this for real-time endpoints that must never be cached: analytics, live data, mutations.

---

## CacheOnly

Never uses network. Errors if the request is not in cache.

```javascript
import { CacheOnly } from '@anzaui/anza/sw';

const strategy = new CacheOnly('offline-v1');
```

Use this for offline-only pages that were precached during install.

---

## OfflineFallback

Returns a precached fallback page when a navigation request fails.

```javascript
import { OfflineFallback } from '@anzaui/anza/sw';

const strategy = new OfflineFallback('/offline.html');
```

Only applies to `mode === 'navigate'` requests. Non-navigation errors pass through unchanged.

---

## TTL and Expiry

All strategies that cache responses accept a `ttl` option. The SW stores the response with a custom `x-expires-at` header. When the entry is older than the TTL, the strategy treats it as a cache miss.

Expired entries are not deleted automatically. Use `pruneExpired` or `setupAutoPrune` to clean them up:

```javascript
import { pruneExpired, setupAutoPrune } from '@anzaui/anza/sw';

// One-time cleanup
await pruneExpired('shell-v1');

// Periodic cleanup every 60 seconds
const timer = setupAutoPrune('shell-v1', 60000);
```
