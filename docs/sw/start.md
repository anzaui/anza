# Start

Write a Service Worker that caches your shell and intercepts API calls.

---

## 1. Create `src/sw.js`

The scaffold generates this file for you. Here is what it contains:

```javascript
import { precache, router, CacheFirst, NetworkFirst, pruneStale, claim } from '@anzaui/anza/sw';

const SHELL = 'shell-v3';
const API = 'api-v3';

self.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      await precache(SHELL, ['/index.html', '/app.js', '/tokens/index.css', '/styles/index.css']);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(Promise.all([pruneStale(SHELL), claim()]));
});

const r = router();
r.register('*', new CacheFirst(SHELL));
r.register('/api/*', new NetworkFirst(API, { timeout: 3000 }));

self.addEventListener('fetch', (e) => {
  if (r.handle(e)) return;
  e.respondWith(fetch(e.request));
});
```

What it does:

1. On `install`, precaches the app shell into a cache named `shell-v3`, then `skipWaiting()` so the new worker can activate without closing every tab
2. On `activate`, deletes other cache names (e.g. an older `shell-v2`) and claims all tabs
3. Registers two routes: static assets get `CacheFirst`, API calls get `NetworkFirst` with a 3-second timeout
4. On `fetch`, tries the router first; unmatched requests fall through to the network

Bump `SHELL` / `API` cache names when you ship path-breaking asset URL changes — `CacheFirst` with no TTL otherwise pins stale JS forever. `pruneStale` only removes *other* cache names, not entries inside the current one.

Keep helpers in optional `src/sw/` and `import` them from `src/sw.js` — that folder is **modules only**, not extra registrations. Multi-scope workers (advanced) use `anza.json` `sw` arrays — see [intro/structure.md](../intro/structure.md#service-workers).

---

## 2. Register from `app.js`

```javascript
import '@anzaui/anza/ui';
import { dock } from '@anzaui/anza/ui';

// Register the Service Worker
navigator.serviceWorker.register('/sw.js');

// Layout shell
dock('main');

// Pages
import './pages/index/index.js';
```

`navigator.serviceWorker.register('/sw.js')` starts the SW. The browser resolves the path relative to the page origin, so `/sw.js` is correct.

---

## 3. Send Messages from the Main Thread

Use the offline bridge to send tasks to the active SW:

```javascript
import { offline } from '@anzaui/anza/offline';

offline.send('sync', { action: 'flush-queue' });
```

The SW receives this via `message` events. The bridge handles the response as a Promise.

---

## 4. Build Output

After `npm run build`:

```text
dist/
  sw.js              # Your entry — rewritten to use relative imports
  sw/
    index.js         # Re-exports from the library
    strategies.js    # Caching strategy classes
    routes.js        # URLPattern router
    install.js       # Precache helpers
    activate.js      # Lifecycle cleanup
    expire.js        # TTL pruning
    queue.js         # Request serialization
    sync.js          # Background replay
    push.js          # Web Push helpers
```

The build tool copied these from `library/src/sw/` and rewrote bare specifiers in `dist/sw.js` to relative paths like `./sw/index.js`.

---

## Next

Add background sync to replay failed mutations:

```javascript
import { replayQueue } from '@anzaui/anza/sw';

self.addEventListener('sync', (e) => {
  if (e.tag === 'sync-tasks') {
    e.waitUntil(replayQueue());
  }
});
```

Read [sync.md](sync.md) for the full queue API.
