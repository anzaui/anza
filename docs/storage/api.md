# API Reference

Complete reference for the storage facade and internal classes.

**vs `state.storage`:** this package is the tiered KV / OPFS / Cache facade. `state.storage` (`PlatformStorage`) persists reactive-store snapshots and supports a filter-function `query`. Give each a distinct IndexedDB database name (both default to `platform-db`) — see [troubleshooting.md](troubleshooting.md).

---

## Facade

```javascript
import { storage } from '@adukiorg/anza/storage';
```

### `storage.configure(options)`

Reconfigure pools before first use. Returns `storage` for chaining.

```javascript
storage.configure({
  idb: { name: 'my-app', version: 2, migrations: [] },
  lru: { maxSize: 500 },
  cache: { name: 'my-cache' }
});
```

| Option | Default | Description |
| ------ | ------- | ----------- |
| `idb.name` | `'platform-db'` | IndexedDB database name |
| `idb.version` | `1` | Schema version |
| `idb.migrations` | built-in `keyval` | Upgrade callbacks |
| `lru.maxSize` | `200` | In-memory LRU capacity |
| `cache.name` | `'platform-cache'` | Cache API bucket name |

### `storage.get(key, tierOrOptions)`

Read from a tier. Second arg: `'memory' \| 'idb' \| 'opfs' \| 'cache'` or `{ tier }`.

```javascript
await storage.get('name');           // default idb (+ LRU fronting)
await storage.get('name', 'memory');
await storage.get('name', { tier: 'idb' });
```

IDB reads populate the memory LRU. OPFS / cache honor TTL wrappers; expired keys delete and return `null`. Cache tier parses JSON when possible, else text.

### `storage.set(key, value, tierOrOptions)`

Write to a tier. Options: `{ tier, ttl }` (TTL in ms, honored across tiers).

```javascript
await storage.set('name', 'Alice');
await storage.set('name', 'Alice', 'memory');
await storage.set('name', 'Alice', { tier: 'idb', ttl: 60000 });
```

IDB path: localStorage write journal (crash recovery), optional gzip when serialized size exceeds `storage.compressionThreshold` (64KB) and Compression Streams are available, then IDB + LRU. Proactive quota check runs before write.

### `storage.delete(key, tierOrOptions)`

Remove from the requested tier. Always clears the memory LRU entry for that key.

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

List keys. Default `idb` → `keyval` keys. `opfs` → OPFS paths. `cache` → request URLs.

### `storage.clear(tier)`

`tier`: `'all'` (default) \| `'memory'` (via LRU clear on all clears) \| `'idb'` \| `'opfs'` \| `'cache'`. Clearing always empties the LRU; then clears the named durable tier(s).

### `storage.estimate()` / `persist()` / `persisted()`

```javascript
const { usage, quota, persisted } = await storage.estimate();
await storage.persist();
const ok = await storage.persisted();
```

### `storage.onQuotaWarning(handler)`

Registers a quota warning listener; returns a disposer. Also see [quota.md](quota.md).

### `storage.compressionThreshold`

Number (default `65536`). Values whose serialized length exceeds this may be gzip-compressed on IDB write when Compression Streams are available.

---

## Database

```javascript
import { Database } from '@adukiorg/anza/storage';
```

### `new Database(name, version, migrations)`

### `db.open()`

Returns `Promise<IDBDatabase>`.

### `db.get(storeName, key)` / `db.set` / `db.delete` / `db.clear` / `db.getAll` / `db.keys`

### `db.query(storeName, options)`

Options: `{ index, range, direction, limit }`.

### `db.transaction(storeNames, mode, callback)`

Multi-store transactional callback.

---

## CacheStorage

```javascript
import { CacheStorage } from '@adukiorg/anza/storage';
```

### `new CacheStorage(name)`

### `cache.get(request)` → `Promise<Response | null>`

### `cache.set(request, response, ttlMs)`

### `cache.delete(request)` / `cache.clear()`

TTL is stored via an `x-expires-at` header on cached responses.

---

## LRUCache / WeakLRUCache

### `new LRUCache(maxSize)` — `get` / `set(key, value, ttlMs)` / `delete` / `clear`

### `new WeakLRUCache(maxSize)` — values must be objects or functions

---

## QuotaManager

```javascript
import { quota } from '@adukiorg/anza/storage';
```

### `quota.estimate()` / `quota.persist()` / `quota.check(onWarning)` / `quota.onQuotaWarning(handler)`
