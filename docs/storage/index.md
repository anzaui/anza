# Storage

The Anza storage layer provides a unified, tiered storage surface. It integrates LRU memory caching, IndexedDB, Origin Private File System (OPFS), and the Cache API under a single facade with automatic tier fallback, TTL support, and transparent gzip compression.

**vs `state.storage`:** use `@anzaui/anza/storage` for general key/value, files, and HTTP cache tiers. Use `state.storage` (`PlatformStorage`) for reactive-store snapshots keyed by object-store name — including filter-function `query`. If you use both, give them **different IndexedDB database names** (both default to `platform-db` — see [troubleshooting.md](troubleshooting.md)).

## What You Get

- **Unified API** — `storage.get`, `storage.set`, `storage.delete` with tier selection
- **Multiple tiers** — `memory` (LRU), `idb` (IndexedDB), `opfs` (file system), `cache` (Cache API)
- **TTL** — per-key expiry honored across all tiers
- **Compression** — automatic gzip for values over 64KB in IndexedDB (when Compression Streams exist)
- **Write journaling** — localStorage-backed journal for crash recovery on IDB writes
- **Quota management** — proactive checks, eviction, and warning callbacks
- **List / clear / estimate** — `storage.list`, `storage.clear`, `storage.estimate` / `persist`

## Package

```javascript
import { storage } from '@anzaui/anza/storage';
```

Call `storage.configure({ idb: { name: 'app-kv' } })` before first use when sharing a page with `state.storage`.

## File Map

| File | What It Covers |
| ----- | --------------- |
| [quickstart.md](quickstart.md) | Your first get/set in five minutes |
| [tiers.md](tiers.md) | Storage tiers and when to use each |
| [idb.md](idb.md) | IndexedDB adapter, migrations, transactions |
| [opfs.md](opfs.md) | Origin Private File System via Web Worker |
| [cache.md](cache.md) | Cache API wrapper with TTL |
| [lru.md](lru.md) | In-memory LRU and WeakLRU caches |
| [quota.md](quota.md) | Quota estimation, persistence, warnings |
| [api.md](api.md) | Complete API reference |
| [troubleshooting.md](troubleshooting.md) | Common problems and how to fix them |

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
await storage.set('temp', data, { tier: 'idb', ttl: 300000 });

// OPFS for large files
await storage.set('blob', fileBuffer, 'opfs');

// Cache tier
await storage.set('config', settings, 'cache');

const keys = await storage.list();
```

## Next Steps

- New to storage? Start with [quickstart.md](quickstart.md).
- Choosing a tier? Read [tiers.md](tiers.md).
- Need migrations? [idb.md](idb.md).
- Large files? [opfs.md](opfs.md).
- Prefer a single reference page? [api.md](api.md).
- Persisting reactive stores? [state/persist.md](../state/persist.md).
