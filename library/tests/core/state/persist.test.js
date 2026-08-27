/**
 * tests/core/state/persist.test.js
 *
 * Unit and integration tests for transaction-aware PlatformStorage.
 */

import { storage, PlatformStorage } from '@anzaui/anza/state';

describe('Platform Storage Persistence', () => {
  let storeName = 'test-store';

  it('should support migrations and basic CRUD operations', async () => {
    const dbName = 'test-platform-db-crud';
    const testStorage = new PlatformStorage();
    testStorage.registerMigrations([
      (db) => {
        db.createObjectStore(storeName);
      }
    ]);
    testStorage.setDatabaseName(dbName);

    await testStorage.open();

    // Set an item
    await testStorage.set(storeName, 'key1', 'value1');

    // Get the item
    const val = await testStorage.get(storeName, 'key1');
    if (val !== 'value1') {
      throw new Error(`Expected "value1", got "${val}"`);
    }

    // Query all
    const all = await testStorage.query(storeName);
    if (all.length !== 1 || all[0] !== 'value1') {
      throw new Error(`Expected ["value1"], got ${JSON.stringify(all)}`);
    }

    // Delete
    await testStorage.delete(storeName, 'key1');
    const valAfterDelete = await testStorage.get(storeName, 'key1');
    if (valAfterDelete !== null) {
      throw new Error(`Expected null after delete, got "${valAfterDelete}"`);
    }
  });

  it('should gracefully unwrap and fallback to raw values for backward compatibility', async () => {
    const dbName = 'test-platform-db-unwrap';
    const testStorage = new PlatformStorage();
    testStorage.registerMigrations([
      (db) => {
        db.createObjectStore(storeName);
      }
    ]);
    testStorage.setDatabaseName(dbName);
    await testStorage.open();

    // Write a raw (non-envelope) value directly into IndexedDB to simulate old data
    const db = await testStorage.open();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put('raw-old-value', 'oldKey');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // Verify PlatformStorage get unwraps / reads it correctly
    const val = await testStorage.get(storeName, 'oldKey');
    if (val !== 'raw-old-value') {
      throw new Error(`Expected "raw-old-value", got "${val}"`);
    }

    // Query should also unwrap it
    const all = await testStorage.query(storeName);
    if (!all.includes('raw-old-value')) {
      throw new Error('Query failed to include unwrapped raw-old-value');
    }
  });

  it('should support TTL-based cache record eviction', async () => {
    const dbName = 'test-platform-db-ttl';
    const testStorage = new PlatformStorage();
    testStorage.registerMigrations([
      (db) => {
        db.createObjectStore(storeName);
      }
    ]);
    testStorage.setDatabaseName(dbName);
    
    // Write item with 10ms TTL
    await testStorage.set(storeName, 'ttlKey', 'ttlValue', { ttl: 10 });
    
    // Retrieve immediately
    const immediate = await testStorage.get(storeName, 'ttlKey');
    if (immediate !== 'ttlValue') {
      throw new Error(`Expected ttlValue, got ${immediate}`);
    }

    // Wait 25ms and trigger quota check (which runs checkAndEvict during set)
    await new Promise((r) => setTimeout(r, 25));

    // Force checkAndEvict by making a set or calling a custom runEviction method
    const originalEstimate = navigator.storage?.estimate;
    if (navigator.storage) {
      navigator.storage.estimate = async () => ({ quota: 1000, usage: 900 });
    }

    try {
      await testStorage.set(storeName, 'dummyKey', 'dummyVal');
      
      // Now ttlKey should be evicted
      const afterEvict = await testStorage.get(storeName, 'ttlKey');
      if (afterEvict !== null) {
        throw new Error(`Expected ttlKey to be evicted, got ${afterEvict}`);
      }
    } finally {
      if (navigator.storage && originalEstimate) {
        navigator.storage.estimate = originalEstimate;
      }
    }
  });

  it('should support LRU-based cache record eviction and dispatch quota event under stress', async () => {
    const dbName = 'test-platform-db-lru';
    const testStorage = new PlatformStorage();
    testStorage.registerMigrations([
      (db) => {
        db.createObjectStore(storeName);
      }
    ]);
    testStorage.setDatabaseName(dbName);

    let quotaEventFired = false;
    const onQuota = () => { quotaEventFired = true; };
    window.addEventListener('quota', onQuota);

    // Start with normal/low usage
    const originalEstimate = navigator.storage?.estimate;
    if (navigator.storage) {
      navigator.storage.estimate = async () => ({ quota: 1000, usage: 500 });
    }

    try {
      // Write some items under normal usage
      await testStorage.set(storeName, 'lru1', 'val1');
      await new Promise(r => setTimeout(r, 5));
      await testStorage.set(storeName, 'lru2', 'val2');
      await new Promise(r => setTimeout(r, 5));
      await testStorage.set(storeName, 'lru3', 'val3');

      // Now stub estimate to exceed 80% usage and decrease on subsequent calls to simulate reclamation
      let mockUsage = 850;
      if (navigator.storage) {
        navigator.storage.estimate = async () => {
          const val = mockUsage;
          mockUsage -= 100; // subsequent calls will be lower
          return { quota: 1000, usage: val };
        };
      }

      // Access lru1 to update lastAccessed timestamp, making lru2 the oldest
      await testStorage.get(storeName, 'lru1');

      // Set item to trigger checkAndEvict. Usage is still 850/1000 (85%)
      await testStorage.set(storeName, 'triggerKey', 'triggerVal');

      // lru2 (oldest accessed) should have been evicted. lru1 (accessed recently) and lru3 should remain.
      const val2 = await testStorage.get(storeName, 'lru2');
      if (val2 !== null) {
        throw new Error(`Expected lru2 to be evicted via LRU, got ${val2}`);
      }

      const val1 = await testStorage.get(storeName, 'lru1');
      if (val1 !== 'val1') {
        throw new Error(`Expected lru1 to survive LRU eviction, got ${val1}`);
      }

      if (!quotaEventFired) {
        throw new Error('Expected "quota" event to fire on window');
      }
    } finally {
      window.removeEventListener('quota', onQuota);
      if (navigator.storage && originalEstimate) {
        navigator.storage.estimate = originalEstimate;
      }
    }
  });
});
