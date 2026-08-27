/**
 * src/core/storage/index.js
 *
 * Unified Storage Gateway.
 * Integrates LRU caching, Cache API, OPFS, and IndexedDB under a unified,
 * tiered public storage surface.
 *
 * Source: doc 22 — Storage Architecture §1, §3
 */

import { Database } from './idb.js';
import { opfs } from './opfs.js';
import { CacheStorage } from './cache.js';
import { LRUCache, WeakLRUCache } from './lru.js';
import { quota } from './quota.js';
import { supports } from '../platform/index.js';

// Default migration: the core key-value store.
const defaultMigrations = [(db) => db.createObjectStore('keyval')];

// Initialize default storage pool instances (reassignable via storage.configure).
let idb = new Database('platform-db', 1, defaultMigrations);
let cache = new CacheStorage('platform-cache');
let lru = new LRUCache(200);

/**
 * Normalizes the 3rd argument of get/set/delete: either a tier string or an
 * options object `{ tier, ttl }`.
 */
function resolve(tierOrOptions, ttl = null) {
  if (tierOrOptions && typeof tierOrOptions === 'object') {
    return { tier: tierOrOptions.tier ?? 'idb', ttl: tierOrOptions.ttl ?? null };
  }
  return { tier: tierOrOptions ?? 'idb', ttl };
}

// Expiry envelope so idb/opfs honor TTL like memory/cache do.
function wrapExpiry(value, ttl) {
  if (!ttl) return value;
  return { __exp: Date.now() + ttl, __v: value };
}

function unwrapExpiry(value) {
  if (value && typeof value === 'object' && typeof value.__exp === 'number') {
    if (Date.now() > value.__exp) return { expired: true, value: null };
    return { expired: false, value: value.__v };
  }
  return { expired: false, value };
}

// Helper functions for transparent compression
async function compress(value) {
  const isObject = typeof value === 'object' && value !== null;
  const stringVal = isObject ? JSON.stringify(value) : String(value);
  const bytes = new TextEncoder().encode(stringVal);
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    }
  }).pipeThrough(new CompressionStream('gzip'));
  const response = new Response(stream);
  const buffer = await response.arrayBuffer();
  return {
    _compressed: true,
    _type: isObject ? 'json' : 'string',
    data: buffer
  };
}

async function decompress(envelope) {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(envelope.data));
      controller.close();
    }
  }).pipeThrough(new DecompressionStream('gzip'));
  const response = new Response(stream);
  const text = await response.text();
  return envelope._type === 'json' ? JSON.parse(text) : text;
}

// Replay write journal automatically on startup
async function replayJournal() {
  if (typeof localStorage === 'undefined') return;
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('storage:journal:')) {
      try {
        const raw = localStorage.getItem(k);
        if (raw) {
          const { key, value } = JSON.parse(raw);
          console.log(`Replaying journal write for key: ${key}`);
          await storage.set(key, value, 'idb');
        }
      } catch (err) {
        console.error(`Failed to replay journal entry ${k}:`, err);
      }
      keysToRemove.push(k);
    }
  }
  for (const k of keysToRemove) {
    localStorage.removeItem(k);
  }
}

if (typeof window !== 'undefined') {
  Promise.resolve().then(() => replayJournal().catch(console.error));
}

export const storage = {
  compressionThreshold: 64 * 1024,

  /**
   * Reconfigures the storage pool. Call before first use.
   *
   * storage.configure({
   *   idb:   { name, version, migrations },
   *   lru:   { maxSize },
   *   cache: { name }
   * });
   */
  configure({ idb: idbOpts, lru: lruOpts, cache: cacheOpts } = {}) {
    if (idbOpts) {
      idb = new Database(
        idbOpts.name ?? 'platform-db',
        idbOpts.version ?? 1,
        idbOpts.migrations ?? defaultMigrations
      );
    }
    if (lruOpts) {
      lru = new LRUCache(lruOpts.maxSize ?? 200);
    }
    if (cacheOpts) {
      cache = new CacheStorage(cacheOpts.name ?? 'platform-cache');
    }
    return this;
  },

  /**
   * Retrieves an item from the requested tier.
   * The 2nd argument may be a tier string or `{ tier }`.
   */
  async get(key, tierOrOptions = 'idb') {
    const { tier } = resolve(tierOrOptions);

    if (tier === 'memory') {
      return lru.get(key);
    }

    if (tier === 'opfs') {
      const stored = await opfs.get(key);
      const ex = unwrapExpiry(stored);
      if (ex.expired) {
        await opfs.delete(key);
        return null;
      }
      return ex.value;
    }

    if (tier === 'cache') {
      const res = await cache.get(key);
      if (!res) return null;
      try {
        return await res.json();
      } catch {
        return await res.text();
      }
    }

    // Default 'idb' read with LRU memory caching
    const cached = lru.get(key);
    if (cached !== null) return cached;

    let value = await idb.get('keyval', key);
    if (value !== null) {
      const ex = unwrapExpiry(value);
      if (ex.expired) {
        await idb.delete('keyval', key);
        return null;
      }
      value = ex.value;

      if (value && value._compressed && value.data) {
        try {
          value = await decompress(value);
        } catch (err) {
          console.error('Decompression failed:', err);
        }
      }
      lru.set(key, value);
    }
    return value;
  },

  /**
   * Saves an item to the requested tier.
   * The 2nd argument may be a tier string or `{ tier, ttl }`. TTL is honored across all tiers.
   */
  async set(key, value, tierOrOptions = 'idb') {
    const { tier, ttl } = resolve(tierOrOptions);

    // Quota proactive check before write
    await quota.check();

    if (tier === 'memory') {
      lru.set(key, value, ttl);
      return;
    }

    if (tier === 'opfs') {
      await opfs.set(key, wrapExpiry(value, ttl));
      return;
    }

    if (tier === 'cache') {
      const response = new Response(
        typeof value === 'object' ? JSON.stringify(value) : String(value),
        {
          headers: {
            'content-type': typeof value === 'object' ? 'application/json' : 'text/plain'
          }
        }
      );
      await cache.set(key, response, ttl);
      return;
    }

    // Default: Write to IDB and cache in LRU
    const journalKey = `storage:journal:${key}`;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(journalKey, JSON.stringify({ key, value }));
      } catch (err) {
        console.warn('Failed to write journal:', err);
      }
    }

    try {
      let finalValue = value;
      if (supports.compression) {
        const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);
        if (serialized.length > this.compressionThreshold) {
          try {
            finalValue = await compress(value);
          } catch (err) {
            console.error('Compression failed:', err);
          }
        }
      }

      await idb.set('keyval', key, wrapExpiry(finalValue, ttl));
      lru.set(key, value, ttl);
    } finally {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(journalKey);
      }
    }
  },

  /**
   * Deletes an item from the storage tiers.
   */
  async delete(key, tierOrOptions = 'idb') {
    const { tier } = resolve(tierOrOptions);
    lru.delete(key);

    if (tier === 'opfs') {
      await opfs.delete(key);
      return;
    }

    if (tier === 'cache') {
      await cache.delete(key);
      return;
    }

    await idb.delete('keyval', key);
  },

  /**
   * Performs advanced index/cursor queries on the IDB store.
   */
  async query(storeName, queryOpts) {
    return idb.query(storeName, queryOpts);
  },

  /**
   * Run a callback inside a multi-store transaction context.
   */
  transaction(storeNames, mode, fn) {
    return idb.transaction(storeNames, mode, fn);
  },

  /**
   * Lists keys available in the store.
   */
  async list(tier = 'idb') {
    if (tier === 'opfs') {
      return opfs.list();
    }

    if (tier === 'cache') {
      const c = await cache.open();
      const keys = await c.keys();
      return keys.map((req) => req.url);
    }

    return idb.keys('keyval');
  },

  /**
   * Clears the storage pool for a specific tier or all.
   */
  async clear(tier = 'all') {
    lru.clear();

    if (tier === 'all' || tier === 'opfs') {
      await opfs.clear();
    }

    if (tier === 'all' || tier === 'cache') {
      await cache.clear();
    }

    if (tier === 'all' || tier === 'idb') {
      await idb.clear('keyval');
    }
  },

  /**
   * Retrieves storage quotas.
   */
  async estimate() {
    const est = await quota.estimate();
    const persisted = await this.persisted();
    return {
      quota: est.quota,
      usage: est.usage,
      persisted
    };
  },

  /**
   * Requests storage persistence.
   */
  persist() {
    return quota.persist();
  },

  /**
   * Checks if storage is persisted.
   */
  async persisted() {
    if (typeof navigator !== 'undefined' && navigator.storage?.persisted) {
      return navigator.storage.persisted();
    }
    return false;
  },

  /**
   * Registers a callback for storage quota warning events.
   */
  onQuotaWarning(handler) {
    return quota.onQuotaWarning(handler);
  }
};


// Named class exports — lets consumers instantiate adapters directly:
// import { Database, LRUCache } from '@anzaui/anza/storage';
export { Database, LRUCache, WeakLRUCache };
