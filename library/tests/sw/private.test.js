/**
 * tests/sw/private.test.js
 *
 * X4: strategies never cache private or credentialed responses, and routes
 * only match the worker's own origin unless a pattern names an origin.
 */

import { CacheFirst, NetworkFirst, StaleRevalidate } from '../../src/sw/strategies.js';
import { router } from '../../src/sw/routes.js';

const CACHE_NAME = 'test-sw-private-v1';
const ORIGIN = self.location.origin;

function fakeEvent() {
  return {
    pending: [],
    waitUntil(p) {
      this.pending.push(p);
    },
    settle() {
      return Promise.all(this.pending);
    }
  };
}

const strategies = {
  CacheFirst: () => new CacheFirst(CACHE_NAME),
  NetworkFirst: () => new NetworkFirst(CACHE_NAME),
  StaleRevalidate: () => new StaleRevalidate(CACHE_NAME)
};

/** Cases that must not be written to the cache. */
const privateCases = [
  ['Cache-Control: no-store', () => new Request(`${ORIGIN}/api/me`), { 'Cache-Control': 'no-store' }],
  ['Cache-Control: private', () => new Request(`${ORIGIN}/api/me`), { 'Cache-Control': 'private, max-age=60' }],
  ['Vary: *', () => new Request(`${ORIGIN}/api/me`), { Vary: 'Accept, *' }],
  ['Authorization header', () => new Request(`${ORIGIN}/api/me`, { headers: { Authorization: 'Bearer t' } }), {}],
  ['credentialed cross-origin', () => new Request('https://api.other.test/me', { credentials: 'include' }), {}]
];

describe('SW strategies skip private responses (X4)', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    await caches.delete(CACHE_NAME);
  });

  for (const [name, make] of Object.entries(strategies)) {
    for (const [label, request, headers] of privateCases) {
      it(`${name} does not cache: ${label}`, async () => {
        globalThis.fetch = async () => new Response('secret', { status: 200, headers });
        const req = request();
        const event = fakeEvent();
        const res = await make().handle(req, event);
        if ((await res.text()) !== 'secret') throw new Error('expected the network body');
        await event.settle();
        const cache = await caches.open(CACHE_NAME);
        if (await cache.match(req.url)) throw new Error(`${label} response was cached`);
      });
    }

    it(`${name} still caches a public same-origin response`, async () => {
      globalThis.fetch = async () => new Response('public', { status: 200, headers: { 'Cache-Control': 'public, max-age=60' } });
      const req = new Request(`${ORIGIN}/asset.js`);
      const event = fakeEvent();
      await make().handle(req, event);
      await event.settle();
      const cache = await caches.open(CACHE_NAME);
      if (!(await cache.match(req.url))) throw new Error('public response was not cached');
    });
  }
});

describe('SW routes match the worker origin only (X4)', () => {
  const fire = (r, url) => {
    let handled = false;
    const event = { request: new Request(url), respondWith() { handled = true; } };
    r.handle(event);
    return handled;
  };

  it('does not intercept a cross-origin request for a path-only pattern', () => {
    const r = router();
    r.register('/api/*', { handle: async () => new Response('x') });
    r.register('*', { handle: async () => new Response('x') });
    if (fire(r, 'https://evil.test/api/me')) throw new Error('cross-origin /api/* was intercepted');
    if (!fire(r, `${ORIGIN}/api/me`)) throw new Error('same-origin /api/* was not intercepted');
  });

  it('intercepts cross-origin requests when the pattern names the origin', () => {
    if (typeof URLPattern === 'undefined') return;
    const r = router();
    r.register({ protocol: 'https', hostname: 'cdn.example.test', pathname: '/lib/*' }, { handle: async () => new Response('x') });
    if (!fire(r, 'https://cdn.example.test/lib/a.js')) throw new Error('explicit-origin route did not match');
    if (fire(r, 'https://other.test/lib/a.js')) throw new Error('explicit-origin route matched another host');
  });
});
