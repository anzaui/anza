/**
 * tests/core/storage/idb.test.js
 *
 * Core IndexedDB adapter execution test suite.
 *
 * Source: plan.md Phase 6-A, core/storage/idb.js
 */

import { Database } from '@anzaui/anza/storage';

describe('IndexedDB Database Adapter', () => {
  const dbName = 'test-idb-db';
  let db;

  beforeEach(async () => {
    // Delete database to start clean
    await new Promise((resolve) => {
      const req = indexedDB.deleteDatabase(dbName);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });

    const migrations = [
      (dbInst) => {
        dbInst.createObjectStore('keyval');
      }
    ];

    db = new Database(dbName, 1, migrations);
  });

  afterEach(async () => {
    if (db) db.close();
    await new Promise((resolve) => {
      const req = indexedDB.deleteDatabase(dbName);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  });

  it('should open database and trigger migrations successfully', async () => {
    const rawDb = await db.open();
    if (!rawDb) {
      throw new Error('Database failed to open');
    }
    if (!rawDb.objectStoreNames.contains('keyval')) {
      throw new Error('Object store "keyval" was not created in migrations');
    }
  });

  it('should support transaction set, get, delete, and clear operations', async () => {
    await db.set('keyval', 'name', 'fescii');
    const val = await db.get('keyval', 'name');
    if (val !== 'fescii') {
      throw new Error(`Expected "fescii", got "${val}"`);
    }

    const allKeys = await db.keys('keyval');
    if (allKeys.length !== 1 || allKeys[0] !== 'name') {
      throw new Error(`Expected single key ["name"], got ${JSON.stringify(allKeys)}`);
    }

    await db.delete('keyval', 'name');
    const afterDelete = await db.get('keyval', 'name');
    if (afterDelete !== null) {
      throw new Error('Expected record to be deleted (null)');
    }

    // Set multiple and clear
    await db.set('keyval', 'a', 1);
    await db.set('keyval', 'b', 2);
    const list = await db.getAll('keyval');
    if (list.length !== 2) {
      throw new Error(`Expected 2 items, got ${list.length}`);
    }

    await db.clear('keyval');
    const listAfterClear = await db.getAll('keyval');
    if (listAfterClear.length !== 0) {
      throw new Error(`Expected 0 items after clear, got ${listAfterClear.length}`);
    }
  });
});
