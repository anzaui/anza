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
r.register('/*', new CacheFirst(SHELL));
r.register('/api/*', new NetworkFirst(API, { timeout: 3000 }));

self.addEventListener('fetch', (e) => {
  if (r.handle(e)) return;
  e.respondWith(fetch(e.request));
});
