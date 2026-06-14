/**
 * tests/core/storage/cache.test.js
 *
 * Cache Storage Gateway Adapter execution test suite.
 */

import { storage } from '@adukiorg/anza/storage';

describe('Cache Storage Gateway Adapter', () => {
  beforeEach(async () => {
    await storage.clear('cache');
  });

  afterEach(async () => {
    await storage.clear('cache');
  });

  it('should store and retrieve HTTP-style requests/responses in cache', async () => {
    const val = { ok: true, timestamp: Date.now() };
    await storage.set('http://localhost/api/test', val, 'cache');

    const retrieved = await storage.get('http://localhost/api/test', 'cache');
    if (!retrieved || retrieved.ok !== true) {
      throw new Error(`Expected retrieved object, got ${JSON.stringify(retrieved)}`);
    }

    const list = await storage.list('cache');
    if (list.length !== 1 || list[0] !== 'http://localhost/api/test') {
      throw new Error(`Expected ["http://localhost/api/test"], got ${JSON.stringify(list)}`);
    }

    await storage.delete('http://localhost/api/test', 'cache');
    const afterDelete = await storage.get('http://localhost/api/test', 'cache');
    if (afterDelete !== null) {
      throw new Error('Expected cache entry to be deleted');
    }
  });

  it('should support TTL expiration and automatic eviction on Cache reads', async () => {
    const data = { token: 'short-lived-session' };
    await storage.set('http://localhost/api/token', data, { tier: 'cache', ttl: 5 });

    const activeVal = await storage.get('http://localhost/api/token', 'cache');
    if (!activeVal || activeVal.token !== 'short-lived-session') {
      throw new Error('Expected active token value');
    }

    // Wait for TTL expiration
    await new Promise((resolve) => setTimeout(resolve, 100));

    const expiredVal = await storage.get('http://localhost/api/token', 'cache');
    if (expiredVal !== null) {
      throw new Error('Expected cache entry to be evicted after TTL expired');
    }
  });
});
