/**
 * src/sw.js — Service Worker entry
 */
import { precache, router, CacheFirst, NetworkFirst, StaleRevalidate, claim } from '@anzaui/anza/sw';

// Bump SHELL/API names when shipping path-breaking asset fixes so the activate
// step drops entries that would otherwise pin stale JS.
const SHELL = 'shell-v5';
const API = 'api-v5';
const KEEP = new Set([SHELL, API, 'platform-offline-fallback']);

self.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      await precache(SHELL, ['/index.html', '/app.js', '/tokens/index.css', '/styles/index.css']);
      await self.skipWaiting();
    })()
  );
});

async function pruneOld() {
  for (const key of await caches.keys()) {
    if (!KEEP.has(key)) await caches.delete(key);
  }
}

self.addEventListener('activate', (e) => {
  e.waitUntil(Promise.all([pruneOld(), claim()]));
});

/**
 * Content-hashed (`app.3f9a1c2e.js`, `app-3f9a1c2e.css`) or versioned
 * (`?v=…`) URLs never change, so they may be served CacheFirst. Everything
 * else may change under the same URL and is revalidated in the background.
 */
const HASHED = /[.-][0-9a-f]{8,}\.[a-z0-9]+$/i;
function isVersioned(url) {
  return HASHED.test(url.pathname) || url.searchParams.has('v');
}

const immutable = new CacheFirst(SHELL);
const revalidate = new StaleRevalidate(SHELL);
const assets = {
  handle(request, event) {
    const strategy = isVersioned(new URL(request.url)) ? immutable : revalidate;
    return strategy.handle(request, event);
  }
};

const r = router();
r.register('/api/*', new NetworkFirst(API, { timeout: 3000 }));
r.register('*', assets);

/** CSR fragments, navigations and event streams bypass the SW. */
function shouldBypass(request) {
  if (request.mode === 'navigate') return true;
  if (request.method !== 'GET' && request.method !== 'HEAD') return true;
  if ((request.headers.get('accept') || '').includes('text/event-stream')) return true;

  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return true;
  if (url.pathname.startsWith('/cdn-cgi/')) return true;

  const path = url.pathname;
  return (
    path === '/hmr' ||
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
