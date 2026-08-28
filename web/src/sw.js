/**
 * src/sw.js — Service Worker entry
 */
import { precache, router, CacheFirst, NetworkFirst, pruneStale, claim } from '@anzaui/anza/sw';

// Bump SHELL/API names when shipping path-breaking asset fixes so pruneStale
// drops CacheFirst entries that would otherwise pin stale JS forever.
const SHELL = 'shell-v4';
const API = 'api-v4';

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
  if (request.method !== 'GET' && request.method !== 'HEAD') return true;

  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return true;
  if (url.pathname.startsWith('/cdn-cgi/')) return true;

  const path = url.pathname;
  return (
    path.endsWith('/template.html') ||
    (path.endsWith('/index.html') && path !== '/index.html') ||
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
