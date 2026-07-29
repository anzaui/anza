# Tiers

The storage facade routes reads and writes to one of four tiers. Each tier has different durability, capacity, and performance characteristics.

---

## Tier Comparison

| Tier | Durability | Capacity | Speed | Best For |
| ------ | ------------ | ---------- | ------- | ---------- |
| `memory` | None (refresh clears) | Limited by RAM | Fastest | Hot data, session state |
| `idb` | Durable (IndexedDB) | ~50MB+ | Fast | Default key-value storage |
| `opfs` | Durable (file system) | ~60% of disk | Medium | Large files, binary data |
| `cache` | Durable (Cache API) | ~50MB+ | Fast | API responses, preloaded assets |

---

## Memory

An LRU cache in JavaScript memory. Fastest but lost on page refresh.

```javascript
await storage.set('session', data, 'memory');
const session = await storage.get('session', 'memory');
```

IDB reads automatically populate the memory LRU for subsequent fast access.

---

## IDB (Default)

IndexedDB with an LRU memory fronting cache. Supports TTL, compression, and write journaling.

```javascript
await storage.set('settings', data);           // tier defaults to 'idb'
await storage.set('settings', data, 'idb');    // explicit
await storage.set('settings', data, { tier: 'idb', ttl: 60000 });
```

Values over 64KB are automatically gzip-compressed when the Compression Streams API is available.

---

## OPFS

Origin Private File System via a dedicated Web Worker. Uses synchronous file access handles for high performance.

```javascript
await storage.set('large-file', buffer, 'opfs');
const file = await storage.get('large-file', 'opfs');
```

Cross-tab invalidation is handled via BroadcastChannel. Use OPFS for blobs, images, and large JSON.

---

## Cache

The browser Cache API. Stores `Response` objects.

```javascript
await storage.set('config', response, 'cache');
const cached = await storage.get('config', 'cache'); // returns Response
```

TTL is implemented via `x-expires-at` header on cached responses.

---

## Tier Selection Guide

| Data | Recommended Tier |
| ------ | ----------------- |
| User settings | `idb` |
| Auth token (short-lived) | `memory` or `idb` with TTL |
| Large image/video | `opfs` |
| API response | `cache` or `idb` |
| Component state | `memory` |
| Offline assets | `cache` |
| Files, PDFs | `opfs` |

---

## List / clear across tiers

```javascript
const idbKeys = await storage.list();        // default idb
const files = await storage.list('opfs');
await storage.clear('cache');                // or 'idb' | 'opfs' | 'memory' via LRU | 'all'
```

Configure distinct DB names before first use when also opening `state.storage` — see [troubleshooting.md](troubleshooting.md).
