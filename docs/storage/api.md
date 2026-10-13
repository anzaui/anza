# API Reference

Complete reference for the storage facade and internal classes.

**vs `state.storage`:** this package is the tiered KV / OPFS / Cache facade. `state.storage` (`PlatformStorage`) persists reactive-store snapshots and supports a filter-function `query`. Give each a distinct IndexedDB database name (both default to `platform-db`) — see [Troubleshooting](troubleshooting.md).

## Facade

```javascript
import { storage } from '@anzaui/anza/storage';
```

### `storage.configure(options)`

Reconfigure pools before first use. Returns `storage` for chaining.

```javascript
storage.configure({
  idb: {
    name: 'my-app',
    version: 2,
    migrations: [
      (db) => db.createObjectStore('keyval'), // v1: the facade needs 'keyval'
      (db) => db.createObjectStore('users')   // v2
    ]
  },
  lru: { maxSize: 500 },
  cache: { name: 'my-cache' }
});
```

| Option | Default | Description |
| ------ | ------- | ----------- |
| `idb.name` | `'platform-db'` | IndexedDB database name |
| `idb.version` | `1` | Schema version |
| `idb.migrations` | creates `keyval` | Upgrade callbacks `(db) => void`; index `i` upgrades to version `i + 1`. Custom lists must still create `keyval` |
| `lru.maxSize` | `200` | In-memory LRU capacity |
| `cache.name` | `'platform-cache'` | Cache API bucket name |

### `storage.get(key, tierOrOptions)`

Read from a tier. Second arg: `'memory' \| 'idb' \| 'opfs' \| 'cache'` or `{ tier }`.

```javascript
await storage.get('name');           // default idb (+ LRU fronting)
await storage.get('name', 'memory');
await storage.get('name', { tier: 'idb' });
```

IDB reads check the memory LRU first and populate it on a miss. Every tier honors TTL: expired keys are deleted and return `null`. Missing keys return `null`. Cache tier parses JSON when possible, else text.

### `storage.set(key, value, tierOrOptions)`

Write to a tier. Options: `{ tier, ttl }` (TTL in ms, honored across tiers).

```javascript
await storage.set('name', 'Alice');
await storage.set('name', 'Alice', 'memory');
await storage.set('name', 'Alice', { tier: 'idb', ttl: 60000 });
```

IDB path: localStorage write journal (crash recovery), optional gzip when serialized size exceeds `storage.compressionThreshold` (64KB) and Compression Streams are available, then IDB + LRU. A quota check (`quota.check()`, which notifies `onQuotaWarning` listeners above 80%) runs before persistent writes, at most once a minute; the `memory` tier skips it.

### `storage.delete(key, tierOrOptions)`

Remove from the requested tier. Always clears the memory LRU entry for that key. Any tier other than `opfs` or `cache` (including `memory`) also deletes the `idb` record.

### `storage.query(storeName, queryOpts)`

Advanced IndexedDB **cursor** query (not a filter callback — that is `state.storage.query`).

```javascript
const rows = await storage.query('keyval', {
  index: 'by-status',   // optional
  range: IDBKeyRange.bound('a', 'z'),
  direction: 'next',    // IDBCursorDirection
  limit: 50
});
```

### `storage.transaction(storeNames, mode, callback)`

Multi-store IDB transaction.

```javascript
await storage.transaction(['keyval'], 'readwrite', (store, tx) => {
  store('keyval').put({ id: 1 }, 'one');
});
```

### `storage.list(tier)`

List keys. Default `idb` → `keyval` keys. `opfs` → OPFS file names. `cache` → request URLs. Any other value (including `memory`) lists `idb` keys.

### `storage.clear(tier)`

`tier`: `'all'` (default) \| `'memory'` (via LRU clear on all clears) \| `'idb'` \| `'opfs'` \| `'cache'`. Clearing always empties the LRU; then clears the named durable tier(s).

### `storage.estimate()` / `persist()` / `persisted()`

```javascript
const { usage, quota, persisted } = await storage.estimate();
await storage.persist();
const ok = await storage.persisted();
```

### `storage.onQuotaWarning(handler)`

Registers a quota warning listener; returns a disposer. Also see [Quota](quota.md).

### `storage.compressionThreshold`

Number (default `65536`). Values whose serialized length exceeds this may be gzip-compressed on IDB write when Compression Streams are available.

## Database

```javascript
import { Database } from '@anzaui/anza/storage';
```

### `new Database(name, version, migrations)`

`migrations` is an array of `(db) => void`; index `i` upgrades to version `i + 1`.

### `db.open()` / `db.close()`

`open()` returns `Promise<IDBDatabase>`. Dispatches `storage:blocked` and `storage:versionchange` on `window` (detail `{ name }`). See [IndexedDB](idb.md).

### `db.get(storeName, key)` / `db.set` / `db.delete` / `db.clear` / `db.getAll` / `db.keys`

### `db.query(storeName, options)`

Options: `{ index, range, direction, limit }`.

### `db.transaction(storeNames, mode, callback)`

Multi-store transactional callback.

## Cache tier

The Cache API adapter is internal (it is not exported, because its class name
shadows the global `CacheStorage`). Use the `'cache'` tier of `storage`, and
`storage.configure({ cache: { name } })` to pick the pool name.

TTL is stored via an `x-expires-at` header on cached responses.

## LRUCache / WeakLRUCache

### `new LRUCache(maxSize)` — `get` / `set(key, value, ttlMs)` / `delete` / `clear`

### `new WeakLRUCache(maxSize)` — values must be objects or functions

## QuotaManager

```javascript
import { quota } from '@anzaui/anza/storage';
```

### `quota.estimate()` / `quota.persist()` / `quota.check(onWarning)` / `quota.onQuotaWarning(handler)`

`check` resolves to `true` when usage is above 80% of quota, after calling `onWarning` and the listeners with `{ usage, quota }`. `onQuotaWarning` returns a disposer.

## Not exported

The OPFS manager and the Cache API adapter are internal. Use the `'opfs'` and `'cache'` tiers of `storage`.
