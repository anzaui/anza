# Tiers

The storage facade routes reads and writes to one of four tiers. There is no automatic fallback between tiers: a read goes only to the tier you name.

## Tier Comparison

| Tier | Durability | Stored as | Best For |
| ------ | ------------ | ---------- | ---------- |
| `memory` | None (refresh clears) | The value itself (LRU, 200 entries by default) | Hot data, session state |
| `idb` | Durable (IndexedDB) | Structured clone, gzip above 64KB | Default key-value storage |
| `opfs` | Durable (file system) | JSON text, one file per key | Large JSON documents |
| `cache` | Durable (Cache API) | JSON or text `Response` body | API-shaped data |

All persistent tiers share the origin's storage quota.

## Memory

An LRU cache in JavaScript memory. Fastest but lost on page refresh.

```javascript
await storage.set('session', data, 'memory');
const session = await storage.get('session', 'memory');
```

IDB reads automatically populate the memory LRU for subsequent fast access.

## IDB (Default)

IndexedDB with an LRU memory fronting cache. Supports TTL, compression, and write journaling.

```javascript
await storage.set('settings', data);           // tier defaults to 'idb'
await storage.set('settings', data, 'idb');    // explicit
await storage.set('settings', data, { tier: 'idb', ttl: 60000 });
```

Values over 64KB are automatically gzip-compressed when the Compression Streams API is available.

## OPFS

Origin Private File System via a dedicated Web Worker that uses synchronous file access handles.

```javascript
await storage.set('report', { rows: [] }, 'opfs');
const report = await storage.get('report', 'opfs');
```

Values are written with `JSON.stringify`, so binary data (`ArrayBuffer`, `Blob`, typed arrays) does not round-trip. Writes and deletes post a message on a BroadcastChannel; see [OPFS](opfs.md).

## Cache

The browser Cache API. The value is serialized into a `Response` body (JSON for objects, text otherwise).

```javascript
await storage.set('config', { theme: 'dark' }, 'cache');
const cached = await storage.get('config', 'cache'); // { theme: 'dark' }
```

`get` parses the body as JSON, or returns text if parsing fails.

TTL is implemented via `x-expires-at` header on cached responses.

## Tier Selection Guide

| Data | Recommended Tier |
| ------ | ----------------- |
| User settings | `idb` |
| Auth token (short-lived) | `memory` or `idb` with TTL |
| Large JSON document | `opfs` |
| API response data | `cache` or `idb` |
| Component state | `memory` |
| Binary data (images, files) | `idb` (stored by structured clone) |

## List / clear across tiers

```javascript
const idbKeys = await storage.list();        // default idb
const files = await storage.list('opfs');
await storage.clear('cache');                // or 'idb' | 'opfs' | 'memory' via LRU | 'all'
```

Configure distinct DB names before first use when also opening `state.storage` — see [Troubleshooting](troubleshooting.md).
