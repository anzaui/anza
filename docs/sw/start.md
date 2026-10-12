# Start

Write a Service Worker that caches your shell and intercepts API calls.

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
r.register('/api/*', new NetworkFirst(API, { timeout: 3000 }));  // more specific: wins over '*'

self.addEventListener('fetch', (e) => {
  if (r.handle(e)) return;
  e.respondWith(fetch(e.request));
});
```

What it does:

1. On `install`, precaches the app shell into a cache named `shell-v3`, then `skipWaiting()` so the new worker can activate without closing every tab
2. On `activate`, deletes other cache names (e.g. an older `shell-v2`) and claims all tabs
3. Registers two routes: API calls get `NetworkFirst` with a 3-second timeout (the most specific match wins, so `/api/*` beats `'*'`), everything else gets `CacheFirst`
4. On `fetch`, tries the router first; unmatched requests fall through to the network

Bump `SHELL` / `API` cache names when you ship path-breaking asset URL changes — `CacheFirst` with no TTL otherwise pins stale JS forever. `pruneStale` only removes *other* cache names, not entries inside the current one.

Keep helpers in optional `src/sw/` and `import` them from `src/sw.js` — that folder is **modules only**, not extra registrations. Multi-scope workers (advanced) use `anza.json` `sw` arrays — see [Structure: Service workers](../intro/structure.md#service-workers).

## 2. Register from `app.js`

```javascript
import '@anzaui/anza/ui';
import { dock } from '@anzaui/anza/ui';

// Register the Service Worker on deployed hosts only.
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
if ('serviceWorker' in navigator) {
  if (LOCAL_HOSTS.has(location.hostname)) {
    // Dev: remove workers and caches left over from earlier builds.
    navigator.serviceWorker.getRegistrations().then(async (regs) => {
      if (!regs.length) return;
      await Promise.all(regs.map((reg) => reg.unregister()));
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    });
  } else {
    navigator.serviceWorker.register('/sw.js', { type: 'module' });
  }
}

// Layout shell
dock('main');
```

`navigator.serviceWorker.register('/sw.js')` starts the SW. The browser resolves the path relative to the page origin, so `/sw.js` is correct.

**Don't run the SW in dev.** A caching worker on `localhost` serves old JS/CSS
after you edit a file, so changes seem to need a hard refresh. Register it only
on deployed hosts, and unregister any leftover worker locally, as above (this
is what the Anza site does in `web/src/app.js`). To test the SW itself, run a
production build (`npx anza build`) and serve `dist/` on a non-local hostname,
or use DevTools > Application > Service workers > "Update on reload".

## 3. Send Messages from the Main Thread

Use the offline bridge to send tasks to the active SW:

```javascript
import { offline } from '@anzaui/anza/offline';

offline.send('sync', { action: 'flush-queue' });
```

The SW receives this via `message` events. The bridge handles the response as a Promise.

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

Read [Sync](sync.md) for the full queue API.
