# Quick Start

Get reading and writing in five minutes.

## 1. Write and Read

```javascript
import { storage } from '@anzaui/anza/storage';

await storage.set('name', 'Alice');
const name = await storage.get('name');
console.log(name); // 'Alice'
```

Default tier is IndexedDB with an LRU memory cache.

## 2. Choose a Tier

```javascript
// Memory — fastest, lost on refresh
await storage.set('hot', data, 'memory');

// IndexedDB — durable, default
await storage.set('profile', data, 'idb');

// OPFS — large files, synchronous worker-backed
await storage.set('image', buffer, 'opfs');

// Cache API — HTTP-like request/response
await storage.set('api-data', response, 'cache');
```

## 3. Set TTL

```javascript
// Expires after 60 seconds
await storage.set('token', 'abc', { tier: 'idb', ttl: 60000 });

// After expiry, get returns null
await new Promise(r => setTimeout(r, 61000));
await storage.get('token'); // null
```

## 4. Delete

```javascript
await storage.delete('name');
```

Deletes from all tiers (memory + the specified tier).

## 5. List keys / clear / estimate

```javascript
const keys = await storage.list();           // IDB keyval keys (default)
const opfsKeys = await storage.list('opfs');

await storage.clear('memory'); // or 'idb' | 'opfs' | 'cache' | 'all'

const est = await storage.estimate();
console.log(est.usage, est.quota, est.persisted);
```

Advanced IndexedDB cursor queries use options (not a filter callback) — see [api.md](api.md#storagequerystorename-queryopts). For reactive-store snapshots with a filter function, use `state.storage.query` ([state/persist.md](../state/persist.md)).

## 6. Configure

```javascript
storage.configure({
  idb: { name: 'my-app', version: 2 },
  lru: { maxSize: 500 }
});
```

Call `configure` before the first read/write.

## Complete Working Example

```javascript
import { storage } from '@anzaui/anza/storage';

// Reconfigure for the app
storage.configure({
  idb: { name: 'my-app-db', version: 1 }
});

// Cache user profile in memory and IDB
await storage.set('profile', { name: 'Alice', role: 'admin' });

// Fast in-memory lookup on next read
const profile = await storage.get('profile'); // hits LRU cache

// Store large image in OPFS
const buffer = await fetchImage('/avatar.jpg');
await storage.set('avatar', buffer, 'opfs');

// Temporary API cache
await storage.set('posts', posts, { tier: 'cache', ttl: 300000 });

// Clean up
await storage.delete('posts');
```
