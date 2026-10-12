/**
 * tests/sw/respond-first.test.js
 *
 * P8: strategies respond before the cache write finishes, hand the write to
 * event.waitUntil, store TTLs without buffering the body, and clear the
 * NetworkFirst timeout timer.
 */

import {
  CacheFirst,
  NetworkFirst,
  StaleRevalidate,
  CacheThenNetwork,
  OfflineFallback
} from '../../src/sw/strategies.js';

const CACHE_NAME = 'test-sw-respond-first-v1';
const URL_A = 'https://example.com/asset.js';

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

describe('SW strategies respond first (P8)', () => {
  let originalFetch;
  let originalPut;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    originalPut = Cache.prototype.put;
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    Cache.prototype.put = originalPut;
    await caches.delete(CACHE_NAME);
  });

  it('CacheFirst responds before cache.put resolves and passes it to waitUntil', async () => {
    globalThis.fetch = async () => new Response('net', { status: 200 });
    let release;
    const gate = new Promise((r) => (release = r));
    Cache.prototype.put = function (...args) {
      return gate.then(() => originalPut.apply(this, args));
    };

    const event = fakeEvent();
    const response = await new CacheFirst(CACHE_NAME).handle(new Request(URL_A), event);
    if ((await response.text()) !== 'net') throw new Error('expected network body');
    if (event.pending.length !== 1) throw new Error('expected cache write handed to waitUntil');

    const cache = await caches.open(CACHE_NAME);
    if (await cache.match(URL_A)) throw new Error('write should still be pending');

    release();
    await event.settle();
    const stored = await cache.match(URL_A);
    if (!stored || (await stored.text()) !== 'net') throw new Error('expected cached copy after waitUntil');
  });

  it('stores the TTL header without reading the body into a blob', async () => {
    globalThis.fetch = async () => new Response('ttl-body', { status: 200 });
    const originalBlob = Response.prototype.blob;
    Response.prototype.blob = function () {
      throw new Error('blob() must not be called');
    };
    try {
      const event = fakeEvent();
      const before = Date.now();
      const response = await new CacheFirst(CACHE_NAME, { ttl: 60000 }).handle(new Request(URL_A), event);
      await event.settle();
      if ((await response.text()) !== 'ttl-body') throw new Error('expected network body');

      const stored = await (await caches.open(CACHE_NAME)).match(URL_A);
      const expiresAt = Number(stored.headers.get('x-expires-at'));
      if (!(expiresAt >= before + 60000)) throw new Error('expected x-expires-at header');
      if ((await stored.text()) !== 'ttl-body') throw new Error('expected intact cached body');
    } finally {
      Response.prototype.blob = originalBlob;
    }
  });

  it('CacheFirst refetches an expired entry', async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(
      URL_A,
      new Response('old', { headers: { 'x-expires-at': String(Date.now() - 1000) } })
    );
    globalThis.fetch = async () => new Response('new', { status: 200 });
    const event = fakeEvent();
    const response = await new CacheFirst(CACHE_NAME, { ttl: 1000 }).handle(new Request(URL_A), event);
    await event.settle();
    if ((await response.text()) !== 'new') throw new Error('expected refetch of expired entry');
  });

  it('StaleRevalidate serves the cache and hands the background update to waitUntil', async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(URL_A, new Response('stale'));
    globalThis.fetch = async () => new Response('fresh', { status: 200 });

    const event = fakeEvent();
    const response = await new StaleRevalidate(CACHE_NAME).handle(new Request(URL_A), event);
    if ((await response.text()) !== 'stale') throw new Error('expected cached body first');
    if (event.pending.length !== 1) throw new Error('expected background update in waitUntil');

    await event.settle();
    const updated = await cache.match(URL_A);
    if ((await updated.text()) !== 'fresh') throw new Error('expected revalidated cache entry');
  });

  it('NetworkFirst clears its timeout timer when the network wins', async () => {
    globalThis.fetch = async () => new Response('api', { status: 200 });
    const originalClear = globalThis.clearTimeout;
    const cleared = [];
    globalThis.clearTimeout = (id) => {
      cleared.push(id);
      return originalClear(id);
    };
    try {
      const event = fakeEvent();
      const response = await new NetworkFirst(CACHE_NAME, { timeout: 5000 }).handle(
        new Request('https://example.com/api/x'),
        event
      );
      await event.settle();
      if ((await response.text()) !== 'api') throw new Error('expected network body');
      if (cleared.length === 0) throw new Error('expected the timeout timer to be cleared');
    } finally {
      globalThis.clearTimeout = originalClear;
    }
  });

  it('NetworkFirst serves the cache on timeout, and waits for the network when nothing is cached', async () => {
    let release;
    globalThis.fetch = () => new Promise((r) => (release = () => r(new Response('slow'))));
    const strategy = new NetworkFirst(CACHE_NAME, { timeout: 10 });

    const pending = strategy.handle(new Request('https://example.com/api/slow'), fakeEvent());
    await new Promise((r) => setTimeout(r, 30));
    release();
    if ((await (await pending).text()) !== 'slow') throw new Error('expected slow network body');

    const cache = await caches.open(CACHE_NAME);
    await cache.put('https://example.com/api/cached', new Response('cached'));
    globalThis.fetch = () => new Promise(() => {});
    const response = await strategy.handle(new Request('https://example.com/api/cached'), fakeEvent());
    if ((await response.text()) !== 'cached') throw new Error('expected cached body on timeout');
  });

  it('CacheThenNetwork returns the network body intact while notifying in the background', async () => {
    globalThis.fetch = async () =>
      new Response('{"a":1}', { status: 200, headers: { 'content-type': 'application/json' } });
    const event = fakeEvent();
    const response = await new CacheThenNetwork(CACHE_NAME).handle(new Request(URL_A), event);
    if ((await response.text()) !== '{"a":1}') throw new Error('expected network body');
    await event.settle();
  });

  it('OfflineFallback ignores a FetchEvent passed in the error position', async () => {
    const request = new Request('https://example.com/x');
    try {
      await new OfflineFallback('/offline.html').handle(request, fakeEvent());
      throw new Error('expected rejection');
    } catch (err) {
      if (!(err instanceof Error) || !/offline fallback/.test(err.message)) {
        throw new Error('expected the default fallback error, got ' + err);
      }
    }
  });
});
