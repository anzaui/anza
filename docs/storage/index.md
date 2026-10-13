---
title: "Storage"
order: 11
---

# Storage

The Anza storage layer puts an LRU memory cache, IndexedDB, the Origin Private File System (OPFS) and the Cache API behind one facade. You pick the tier per call. It supports TTLs and gzips large IndexedDB values.

**vs `state.storage`:** use `@anzaui/anza/storage` for general key/value, files, and HTTP cache tiers. Use `state.storage` (`PlatformStorage`) for reactive-store snapshots keyed by object-store name — including filter-function `query`. If you use both, give them **different IndexedDB database names** (both default to `platform-db` — see [Troubleshooting](troubleshooting.md)).

## What You Get

- **Unified API** — `storage.get`, `storage.set`, `storage.delete` with tier selection
- **Multiple tiers** — `memory` (LRU), `idb` (IndexedDB), `opfs` (file system), `cache` (Cache API)
- **TTL** — per-key expiry honored across all tiers
- **Compression** — automatic gzip for values over 64KB in IndexedDB (when Compression Streams exist)
- **Write journaling** — localStorage-backed journal for crash recovery on IDB writes
- **Quota management** — throttled checks before persistent writes, with warning callbacks above 80%
- **List / clear / estimate** — `storage.list`, `storage.clear`, `storage.estimate` / `persist`

## Package

```javascript
import { storage } from '@anzaui/anza/storage';
```

Call `storage.configure({ idb: { name: 'app-kv' } })` before first use when sharing a page with `state.storage`.

## File Map

| File | What It Covers |
| ----- | --------------- |
| [Quick Start](quickstart.md) | Your first get/set in five minutes |
| [Tiers](tiers.md) | Storage tiers and when to use each |
| [IndexedDB](idb.md) | IndexedDB adapter, migrations, transactions |
| [OPFS](opfs.md) | Origin Private File System via Web Worker |
| [Cache](cache.md) | Cache API tier with TTL |
| [LRU](lru.md) | In-memory LRU and WeakLRU caches |
| [Quota](quota.md) | Quota estimation, persistence, warnings |
| [API Reference](api.md) | Complete API reference |
| [Troubleshooting](troubleshooting.md) | Common problems and how to fix them |

## One-File Example

```javascript
import { storage } from '@anzaui/anza/storage';

storage.configure({ idb: { name: 'app-kv' } });

// Basic IDB read/write
await storage.set('user', { name: 'Alice' });
const user = await storage.get('user');

// Memory tier for hot data
await storage.set('session', { token: 'abc' }, 'memory');

// TTL — expires in 5 minutes
await storage.set('temp', { step: 2 }, { tier: 'idb', ttl: 300000 });

// OPFS for large JSON documents
await storage.set('report', { rows: [] }, 'opfs');

// Cache tier
await storage.set('config', { theme: 'dark' }, 'cache');

const keys = await storage.list();
```

## Next Steps

- New to storage? Start with [Quick Start](quickstart.md).
- Choosing a tier? Read [Tiers](tiers.md).
- Need migrations? [IndexedDB](idb.md).
- Large JSON documents? [OPFS](opfs.md).
- Prefer a single reference page? [API Reference](api.md).
- Persisting reactive stores? [Persist](../state/persist.md).
