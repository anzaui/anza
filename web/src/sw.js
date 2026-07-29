/**
 * src/sw.js — Service Worker entry
 */
import { precache, router, CacheFirst, NetworkFirst, pruneStale, claim } from '@adukiorg/anza/sw';

const SHELL = 'shell-v1';
const API = 'api-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(precache(SHELL, ['/index.html', '/app.js', '/tokens/index.css', '/styles/index.css']));
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
    path === '/favicon.ico'
  );
}

self.addEventListener('fetch', (e) => {
  if (shouldBypass(e.request)) return;
  if (r.handle(e)) return;
  e.respondWith(fetch(e.request));
});
