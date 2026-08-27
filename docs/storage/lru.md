# LRU

Two in-memory cache implementations: a standard LRU for any value type, and a WeakRef-based variant that yields to the garbage collector under memory pressure.

---

## LRUCache

Standard least-recently-used cache with TTL support.

```javascript
import { LRUCache } from '@anzaui/anza/storage';

const cache = new LRUCache(100); // max 100 entries

cache.set('a', 1);
cache.set('b', 2, 5000); // TTL 5 seconds

console.log(cache.get('a')); // 1 (moves to front)
console.log(cache.get('c')); // null
```

When the cache is full, the least recently accessed entry is evicted.

---

## WeakLRUCache

Uses `WeakRef` so values can be garbage collected. Values must be objects or functions.

```javascript
import { WeakLRUCache } from '@anzaui/anza/storage';

const cache = new WeakLRUCache(100);

cache.set('obj', { data: 'hello' });
const obj = cache.get('obj');

// If GC runs and collects the object, subsequent get returns null
```

Use `WeakLRUCache` for large objects where you prefer GC reclaiming memory over strict LRU eviction.

---

## TTL

Both caches support TTL:

```javascript
cache.set('temp', data, 60000); // expires after 60 seconds
```

Expired entries return `null` on access and are removed from the cache.

---

## Storage Integration

The storage facade uses `LRUCache` as the memory tier fronting IDB reads:

```javascript
// First read hits IDB
await storage.get('profile');

// Second read hits LRU cache
await storage.get('profile');
```

---

## Methods

| Method | Description |
| -------- | ------------- |
| `get(key)` | Read and refresh position |
| `set(key, value, ttlMs)` | Write |
| `delete(key)` | Remove |
| `clear()` | Remove all |
