# Native Storage Usage Guide

The Native Storage layer provides a unified, multi-tiered browser storage gateway mapping memory (LRU), IndexedDB (IDB), Origin Private File System (OPFS), and Cache API storage tiers to a single consistent interface. It integrates transparent gzipped compression, write-ahead journaling for crash durability, multi-tab Web Locks serialization, database upgrade upgrade-blocking listeners, and proactive quota estimates.

Import from the storage entry point:

```javascript
import { storage } from '@anzaui/anza/storage';
```

Or import individual adapters directly:

```javascript
import { Database, LRUCache, WeakLRUCache } from '@anzaui/anza/storage';
```

---

## 1. Choosing an API

| Need | Tier / API | Characteristics |
| --- | --- | --- |
| In-memory caching | `'memory'` | Synchronous, ephemeral, size-bounded LRU |
| General structured data | `'idb'` (default) | Asynchronous, persistent, transactional, compressed if >64KB |
| High-performance files | `'opfs'` | Dedicated worker, synchronous I/O access handles, Web Locked |
| HTTP request caching | `'cache'` | Response payloads, Cache API, custom headers, TTL support |
| Check space usage | `storage.estimate()` | Proactive quota assessment, persisted flag |
| Request persistence | `storage.persist()` | Prevents automatic browser-driven eviction |

---

## 2. Configuration

The default pool (`platform-db`, a 200-entry LRU, `platform-cache`) works out of
the box. Call `storage.configure(...)` once, before first use, to customize it.

```javascript
storage.configure({
  idb: { name: 'app-db', version: 2, migrations: [
    (db) => db.createObjectStore('keyval'),
    (db) => db.createObjectStore('users')
  ] },
  lru: { maxSize: 500 },
  cache: { name: 'app-cache' }
});
```

## 3. Gateway Operations

The primary storage gateway exposes five main methods: `get`, `set`, `delete`, `list`, and `clear`.

### Set

Writes an item to the designated tier. If tier is omitted, writes to `'idb'` (IndexedDB) and caches it in memory. The 2nd argument may be a tier string or an options object `{ tier, ttl }`.

```javascript
// Simple key-value write (defaults to idb)
await storage.set('user:session', { token: 'abc' });

// Options object form (preferred when you need a TTL)
await storage.set('temp:config', { theme: 'dark' }, { tier: 'memory', ttl: 5000 });

// Tier string form
await storage.set('temp:config', { theme: 'dark' }, 'memory');

// TTL is honored across ALL tiers (memory, cache, idb, opfs)
await storage.set('draft', payload, { tier: 'idb',  ttl: 60_000 });
await storage.set('scratch', blob, { tier: 'opfs', ttl: 60_000 });

// OPFS write (no expiry)
await storage.set('documents/resume.pdf', arrayBuffer, 'opfs');

// Cache API HTTP request caching with TTL
await storage.set('https://api.example.com/data', apiResponse, { tier: 'cache', ttl: 60000 });
```

Expired idb/opfs entries are removed transparently on the next read.

### Get

Retrieves an item from the designated tier. If tier is omitted, default reads check memory first, then fall back to IndexedDB.

```javascript
// Default read (memory -> IndexedDB fallback)
const session = await storage.get('user:session');

// Tier-specific reads
const config = await storage.get('temp:config', 'memory');
const doc = await storage.get('documents/resume.pdf', 'opfs');
const response = await storage.get('https://api.example.com/data', 'cache');
```

### Delete

Removes a key from the storage pool.

```javascript
await storage.delete('user:session');
await storage.delete('documents/resume.pdf', 'opfs');
```

### List

Lists keys stored in the requested tier.

```javascript
const idbKeys = await storage.list('idb');
const opfsFiles = await storage.list('opfs');
```

### Clear

Wipes the storage pool for a specific tier or all.

```javascript
// Wipe all tiers
await storage.clear('all');

// Wipe a specific tier
await storage.clear('opfs');
```

---

## 4. Multi-Store Transactions

For executing multi-store IndexedDB operations inside a single transactional block:

```javascript
await storage.transaction(['keyval', 'users'], 'readwrite', (store, tx) => {
  const keyvalStore = store('keyval');
  const usersStore = store('users');

  keyvalStore.put({ id: 1 }, 'lastActive');
  usersStore.put({ id: 100, name: 'Alice' }, '100');
});
```

> [!WARNING]
> Transactions auto-commit once control returns to the event loop. Avoid calling slow asynchronous operations (like `await fetch`) inside the transaction callback, as they cause transactions to commit prematurely.

---

## 5. Concurrency Coordination

### Web Locks for OPFS
The Origin Private File System does not serialize cross-tab operations natively. The storage gateway automatically wraps all OPFS file reads and writes inside exclusive Web Locks:
- Reads/writes to a file named `report.json` acquire lock `opfs:report.json`.
- Global operations like `clear()` acquire lock `opfs:global`.

This prevents concurrent write collisions and lock errors across active tabs.

---

## 6. Upgrade Blocking Coordination

When performing schema upgrades, sibling tabs holding active connections can block migrations indefinitely:
- **Blocked Notification:** If an upgrade is blocked, the gateway dispatches a global `'storage:blocked'` window event.
- **Graceful Cleanup:** If another tab requests an upgrade, active connections listen for the `'versionchange'` event, immediately close themselves, and dispatch a global `'storage:versionchange'` window event.

```javascript
window.addEventListener('storage:blocked', (e) => {
  console.warn(`Database upgrade blocked: ${e.detail.name}`);
});

window.addEventListener('storage:versionchange', (e) => {
  console.warn(`Database connection closed to allow upgrade in another tab: ${e.detail.name}`);
});
```

---

## 7. Transparent Compression

To conserve quota and reduce serialization overhead, records exceeding the `compressionThreshold` (default: 64KB) are automatically gzipped using the browser's native `CompressionStream` API before writing to IndexedDB:

```javascript
// Adjust the compression boundary if needed
storage.compressionThreshold = 32 * 1024; // 32KB

// Large dataset (>64KB) gets compressed automatically
await storage.set('large:dataset', largePayload, 'idb');

// Reads automatically decompress the record transparently
const dataset = await storage.get('large:dataset', 'idb');
```

---

## 8. Write Journaling

To protect transaction commits from unexpected tab crashes or power cuts, IndexedDB writes use a synchronous write-ahead journal stored in `localStorage`:
1. The payload is written to `localStorage` under `storage:journal:${key}`.
2. The IndexedDB write executes asynchronously.
3. Upon completion, the journal entry is deleted from `localStorage`.
4. On next boot, the system automatically checks for pending journals and replays them to prevent data loss.

---

## 9. Quota warnings

Subscribe to quota alerts to proactively warn users when browser storage utilization exceeds 80%:

```javascript
const dispose = storage.onQuotaWarning(({ usage, quota }) => {
  console.warn(`Storage space warning: ${(usage / quota * 100).toFixed(1)}% full.`);
});

// To unsubscribe
dispose();
```

---

## 10. Advanced Queries

Query IndexedDB using indexes, ranges, cursors, direction and limits:

```javascript
const records = await storage.query('users', {
  index: 'byAge',
  range: IDBKeyRange.bound(18, 30),
  direction: 'prev',
  limit: 20
});
```
