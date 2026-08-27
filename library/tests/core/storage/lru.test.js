/**
 * tests/core/storage/lru.test.js
 *
 * Core bounded LRU cache execution test suite.
 *
 * Source: plan.md Phase 6-A, core/storage/lru.js
 */

import { LRUCache, WeakLRUCache } from '@anzaui/anza/storage';

describe('Bounded LRU Cache', () => {
  describe('LRUCache', () => {
    it('should set and retrieve values', () => {
      const cache = new LRUCache(5);
      cache.set('a', 1);
      if (cache.get('a') !== 1) {
        throw new Error('Expected 1, got null');
      }
    });

    it('should evict the oldest least-recently-used entry on size breach', () => {
      const cache = new LRUCache(2);
      cache.set('a', 1);
      cache.set('b', 2);
      
      // Access 'a' to refresh its position, making 'b' the oldest
      cache.get('a');
      cache.set('c', 3);

      if (cache.get('b') !== null) {
        throw new Error('Expected "b" to be evicted');
      }
      if (cache.get('a') !== 1 || cache.get('c') !== 3) {
        throw new Error('Expected "a" and "c" to remain in cache');
      }
    });

    it('should evict entries after their TTL duration has elapsed', async () => {
      const cache = new LRUCache(5);
      cache.set('a', 1, 5); // 5ms TTL

      const early = cache.get('a');
      if (early !== 1) {
        throw new Error('Expected "a" to exist early');
      }

      await new Promise((resolve) => setTimeout(resolve, 10));

      const late = cache.get('a');
      if (late !== null) {
        throw new Error('Expected "a" to be expired');
      }
    });
  });

  describe('WeakLRUCache', () => {
    it('should accept objects and resolve references correctly', () => {
      const cache = new WeakLRUCache(2);
      const val = { x: 100 };
      
      cache.set('a', val);
      const resolved = cache.get('a');

      if (resolved !== val || resolved.x !== 100) {
        throw new Error('Expected resolved weak reference object to match val');
      }
    });

    it('should throw TypeError when setting primitive values', () => {
      const cache = new WeakLRUCache(2);
      try {
        cache.set('a', 'primitive string');
        throw new Error('Expected set with primitive to throw TypeError');
      } catch (err) {
        if (!(err instanceof TypeError)) {
          throw new Error(`Expected TypeError, got ${err.name}`);
        }
      }
    });
  });
});
