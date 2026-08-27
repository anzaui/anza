/**
 * src/sw.js — Service Worker entry
 */
import { precache, router, CacheFirst, NetworkFirst, pruneStale, claim } from '@anzaui/anza/sw';

// Bump SHELL/API names when shipping path-breaking asset fixes so pruneStale
// drops CacheFirst entries that would otherwise pin stale JS forever.
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

/** CSR fragments + navigations bypass SW — avoids body-lock races in CacheFirst. */
function shouldBypass(request) {
  if (request.mode === 'navigate') return true;
  const path = new URL(request.url).pathname;
  return (
    path.endsWith('/template.html') ||
    path.endsWith('.tags.json') ||
    path === '/favicon.ico' ||
    path === '/favicon.svg' ||
    path === '/logo.svg'
  );
}

self.addEventListener('fetch', (e) => {
  if (shouldBypass(e.request)) return;
  if (r.handle(e)) return;
  e.respondWith(fetch(e.request));
});
