/**
 * tests/sw/specificity.test.js
 *
 * The SW router picks the most specific matching route (R6) and never
 * intercepts `/hmr` or `Accept: text/event-stream` requests (R4).
 */

import { router } from '../../src/sw/routes.js';
import { CacheFirst, NetworkFirst, StaleRevalidate } from '../../src/sw/strategies.js';

function fire(r, url, headers) {
  const event = {
    request: new Request(url, { headers }),
    respondWith(p) {
      this._p = p;
    }
  };
  return { handled: r.handle(event), event };
}

async function body(event) {
  return (await event._p).text();
}

describe('SW routes specificity', () => {
  it('most specific route wins even when the catch-all is registered first', async () => {
    const r = router();
    r.register('*', { handle: async () => new Response('shell') });
    r.register('/api/*', { handle: async () => new Response('api') });
    r.register('/api/v2/*', { handle: async () => new Response('api-v2') });

    const api = fire(r, 'https://example.com/api/x');
    const v2 = fire(r, 'https://example.com/api/v2/x');
    const shell = fire(r, 'https://example.com/app.js');
    if (!api.handled || !v2.handled || !shell.handled) throw new Error('expected all handled');
    if ((await body(api.event)) !== 'api') throw new Error('expected /api/* strategy');
    if ((await body(v2.event)) !== 'api-v2') throw new Error('expected /api/v2/* strategy');
    if ((await body(shell.event)) !== 'shell') throw new Error('expected catch-all strategy');
  });

  it('picks the specific route without URLPattern too', async () => {
    const saved = globalThis.URLPattern;
    delete globalThis.URLPattern;
    try {
      const r = router();
      r.register('*', { handle: async () => new Response('shell') });
      r.register('/api/*', { handle: async () => new Response('api') });
      const api = fire(r, 'https://example.com/api/x');
      if ((await body(api.event)) !== 'api') throw new Error('expected /api/* strategy');
    } finally {
      if (saved) globalThis.URLPattern = saved;
    }
  });

  it('keeps registration order for equally specific routes', async () => {
    const r = router();
    r.register('/a/*', { handle: async () => new Response('first') });
    r.register('/a/*', { handle: async () => new Response('second') });
    const hit = fire(r, 'https://example.com/a/b');
    if ((await body(hit.event)) !== 'first') throw new Error('expected first registration');
  });
});

describe('SW stream bypass', () => {
  const CACHE_NAME = 'test-sw-stream-v1';

  afterEach(async () => {
    await caches.delete(CACHE_NAME);
  });

  it('router never intercepts /hmr or text/event-stream requests', () => {
    const r = router();
    r.register('*', { handle: async () => new Response('shell') });
    if (fire(r, 'https://example.com/hmr').handled) throw new Error('/hmr must bypass');
    if (fire(r, 'https://example.com/base/hmr').handled) throw new Error('/base/hmr must bypass');
    if (fire(r, 'https://example.com/events', { Accept: 'text/event-stream' }).handled) {
      throw new Error('event streams must bypass');
    }
    if (!fire(r, 'https://example.com/hmr.js').handled) throw new Error('/hmr.js is a normal asset');
  });

  it('caching strategies never store event streams', async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () =>
        new Response('data: x\n\n', { headers: { 'content-type': 'text/event-stream' } });
      for (const Strategy of [CacheFirst, StaleRevalidate, NetworkFirst]) {
        const request = new Request('https://example.com/events', {
          headers: { Accept: 'text/event-stream' }
        });
        await new Strategy(CACHE_NAME).handle(request);
        const cache = await caches.open(CACHE_NAME);
        if (await cache.match(request)) throw new Error(`${Strategy.name} cached an event stream`);
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
