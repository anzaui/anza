/**
 * tests/core/storage/facade.test.js
 *
 * Facade-level smoke: configure, memory tier, TTL options object.
 */

import { storage } from '../../../src/core/storage/index.js';

describe('storage facade', () => {
  it('configure returns the facade and memory get/set round-trip', async () => {
    const ret = storage.configure({ lru: { maxSize: 50 } });
    if (ret !== storage) throw new Error('configure should return storage');

    await storage.set('facade-mem', { ok: true }, 'memory');
    const val = await storage.get('facade-mem', 'memory');
    if (!val || val.ok !== true) throw new Error('memory round-trip failed');
    await storage.delete('facade-mem', 'memory');
  });

  it('accepts { tier, ttl } options on set/get', async () => {
    await storage.set('facade-ttl', 'x', { tier: 'memory', ttl: 60_000 });
    const val = await storage.get('facade-ttl', { tier: 'memory' });
    if (val !== 'x') throw new Error('options object get failed');
    await storage.delete('facade-ttl', { tier: 'memory' });
  });
});
