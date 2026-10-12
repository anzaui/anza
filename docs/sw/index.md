---
title: "Service Worker"
order: 8
---

# SW

The Anza Service Worker toolkit handles caching, request interception, background sync, and push notifications. It runs in a separate thread from your app and intercepts `fetch` events before they hit the network.

The toolkit is split into two halves:

1. **Main thread** (`@anzaui/anza/offline`) — connectivity checks, task queuing, and message bridge to the SW
2. **Service Worker thread** (`@anzaui/anza/sw`) — caching strategies, route interception, lifecycle hooks, and sync replay

Browsers do not support import maps in Service Worker scope, so the build tool rewrites bare specifiers to relative paths when emitting `dist/sw.js`.

## What You Get

- **Caching strategies** — CacheFirst, NetworkFirst, StaleRevalidate, CacheThenNetwork, NetworkOnly, CacheOnly, and OfflineFallback
- **URLPattern routing** — match URLs with parameters and wildcards inside the SW
- **TTL expiry** — responses carry custom headers; expired entries are pruned automatically
- **Install/activate helpers** — precache shell assets and clean up old caches on update
- **Background sync** — queue failed requests and replay them when connectivity returns
- **Push notifications** — VAPID subscription and notification display
- **Request serialization** — store Request objects in IndexedDB for offline replay

## Package

```javascript
// Service Worker thread
import { CacheFirst, router, precache } from '@anzaui/anza/sw';

// Main thread
import { offline } from '@anzaui/anza/offline';
```

## File Map

| File | What It Covers |
| ------ | -------------- |
| [Start](start.md) | Writing your first `src/sw.js` and registering it from `app.js` |
| [Strategies](strategies.md) | The seven caching strategies and their behavior |
| [Routes](routes.md) | URLPattern routing inside the Service Worker |
| [Sync](sync.md) | Background sync queue and replay |
| [API Reference](api.md) | Complete API reference |

## One-File Example

```javascript
// src/sw.js
import { precache, router, CacheFirst, NetworkFirst } from '@anzaui/anza/sw';

self.addEventListener('install', (e) => {
  e.waitUntil(precache('shell-v1', ['/index.html', '/app.js']));
});

const r = router();
r.register('*', new CacheFirst('shell-v1'));
r.register('/api/*', new NetworkFirst('api-v1', { timeout: 3000 }));

self.addEventListener('fetch', (e) => {
  if (r.handle(e)) return;
  e.respondWith(fetch(e.request));
});
```

```javascript
// src/app.js
import '@anzaui/anza/ui';
import { dock } from '@anzaui/anza/ui';

navigator.serviceWorker.register('/sw.js');

dock('main');
```

## Next Steps

- New to SW? Start with [Start](start.md).
- Want caching details? Read [Strategies](strategies.md).
- Need URL routing in the SW? See [Routes](routes.md).
- Building offline queue replay? [Sync](sync.md).
- Prefer a single reference page? [API Reference](api.md).
