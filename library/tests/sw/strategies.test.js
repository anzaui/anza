/**
 * tests/sw/strategies.test.js
 *
 * Validates that SW caching strategies safely handle requests and never
 * attempt to put unsupported methods (e.g. POST) into the Cache API.
 */

import { CacheFirst, NetworkFirst, StaleRevalidate } from '../../src/sw/strategies.js';

describe('SW caching strategies method safety', () => {
  const CACHE_NAME = 'test-sw-cache-v1';

  afterEach(async () => {
    try {
      await caches.delete(CACHE_NAME);
    } catch {}
  });

  it('CacheFirst never attempts cache.put for non-GET requests', async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => new Response('ok', { status: 200 });

      const strategy = new CacheFirst(CACHE_NAME);
      const postRequest = new Request('https://example.com/api/submit', {
        method: 'POST',
        body: JSON.stringify({ test: true })
      });

      const response = await strategy.handle(postRequest);
      const text = await response.text();
      if (text !== 'ok') {
        throw new Error('Expected successful response');
      }

      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(postRequest);
      if (cached) {
        throw new Error('POST request must not be stored in cache');
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('NetworkFirst never attempts cache.put for non-GET requests', async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => new Response('created', { status: 201 });

      const strategy = new NetworkFirst(CACHE_NAME);
      const postRequest = new Request('https://example.com/api/items', {
        method: 'POST',
        body: JSON.stringify({ item: 'box' })
      });

      const response = await strategy.handle(postRequest);
      const text = await response.text();
      if (text !== 'created') {
        throw new Error('Expected created response');
      }

      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(postRequest);
      if (cached) {
        throw new Error('POST request must not be stored in cache');
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
