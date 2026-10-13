# Persist

`PlatformStorage` provides transactional IndexedDB persistence for reactive state. It supports schema migrations, a per-record TTL, and eviction when storage usage exceeds 80% of quota.

`PlatformStorage` creates no object stores on its own. Register a migration that creates the stores you use (for example `keyval`) before the first read or write. See [Schema Migrations](#schema-migrations).

This is **not** the tiered `@anzaui/anza/storage` facade. Prefer `state.storage` for hydrating `state.create` stores; use the storage package for general KV, OPFS, and Cache API. Give each a distinct DB name if both are open (see [Troubleshooting](../storage/troubleshooting.md)).

## Bridge pattern

Hydrate a store from IndexedDB, then persist on change. Prefer this over inventing a second persistence layer with `@anzaui/anza/storage` for the same keys.

```javascript
import { state } from '@anzaui/anza/state';

const store = state.create({ user: null });
const ctrl = new AbortController();

// Create the 'keyval' object store on first open
state.storage.registerMigrations([(db) => db.createObjectStore('keyval')]);

// Boot
const saved = await state.storage.get('keyval', 'user');
if (saved) store.hydrate({ user: saved });

// Persist on change
store.subscribe('user', async (user) => {
  await state.storage.set('keyval', 'user', user);
}, ctrl.signal);
```

The important split is:

| Concern | Prefer |
| ------- | ------ |
| Reactive store snapshots keyed by object store + record key | `state.storage` |
| General KV, blobs, OPFS, Cache API, tier selection | `@anzaui/anza/storage` |

Mixing both is fine, but treat them as separate persistence systems with separate database names.

## Basic Use

```javascript
import { state } from '@anzaui/anza/state';

// Write
await state.storage.set('keyval', 'user', { name: 'Alice' });

// Read
const user = await state.storage.get('keyval', 'user');

// Delete
await state.storage.delete('keyval', 'user');
```

Signature shape: `set(storeName, key, value, options?)`, `get(storeName, key)`, `delete(storeName, key)` — store-scoped, unlike the tiered `storage.set(key, value, tier)` facade.

### API surface at a glance

| Call | Role |
| ---- | ---- |
| `set(storeName, key, value, { ttl? })` | Persist or update a record |
| `get(storeName, key)` | Read one record (`null` if missing) |
| `delete(storeName, key)` | Remove one record |
| `query(storeName, predicate?)` | Read all records and filter in JS |
| `registerMigrations([...])` | Define sequential schema upgrades before first open |
| `setDatabaseName(name)` | Isolate the DB name before first open |
| `persist()` / `isPersisted()` | Ask the browser for persistent storage |
| `estimate()` | `navigator.storage.estimate()`, or `{ quota: 0, usage: 0 }` |
| `open()` | Open the database (called for you by the other methods) |

## Schema Migrations

Register migration functions before opening the database:

```javascript
state.storage.registerMigrations([
  (db, tx) => {
    // Version 0 -> 1 (new database)
    db.createObjectStore('keyval');
  },
  (db, tx) => {
    // Version 1 -> 2
    db.createObjectStore('settings');
  }
]);
```

Migrations run in order inside `onupgradeneeded`. Function `i` upgrades the database to version `i + 1`, so the database version equals the number of migrations. Only the steps above the stored version run.

Call `registerMigrations()` before any `get()` / `set()` opens IndexedDB. Once the first connection is live, changing the migration list in the same session will not re-run already-open upgrades.

## TTL

```javascript
// Mark the record as expiring in 60 seconds
await state.storage.set('keyval', 'token', 'abc123', { ttl: 60000 });
```

The expiry time is stored on the record envelope next to `lastAccessed`. `get()` does not check it: an expired record is still returned until it is removed. Expired records are deleted only by quota eviction (below). If you need strict expiry, store your own timestamp in the value and check it after reading.

Reads unwrap the envelope, so `get()` returns the stored value or `null`.

## Quota-Aware Eviction

When storage usage exceeds 80% of quota:

1. Expired entries are deleted first
2. If still over threshold, least-recently-accessed entries are evicted
3. A `quota` event is dispatched on `window`:

```javascript
window.addEventListener('quota', (e) => {
  console.log('Quota warning:', e.detail.usage, e.detail.quota);
});
```

Eviction only applies to wrapped records in the store being written. If you want different retention policies, split data into different object stores instead of cramming everything into `keyval`.

## Query (filter function)

Unlike `@anzaui/anza/storage` cursor `query`, `state.storage.query` takes a **predicate**:

```javascript
const items = await state.storage.query('keyval', (value) => {
  return value && value.active === true;
});
```

Returns all records matching the filter function.

This is intentionally different from `storage.query(...)` in the storage facade, which exposes IndexedDB cursor options. `state.storage.query()` is the simpler "load and filter values" path for app state.

## Persistence

Request durable storage (exempt from browser eviction):

```javascript
const granted = await state.storage.persist();
console.log('Persistent storage:', granted);
```

Also available:

```javascript
const alreadyPersisted = await state.storage.isPersisted();
```

Persistence reduces browser eviction pressure, but it does not replace your own migrations, validation, or corruption handling.

## Database Name

Call **before** the first open. Required when you also use `@anzaui/anza/storage` (both default to `platform-db`):

```javascript
import { storage } from '@anzaui/anza/storage';
import { state } from '@anzaui/anza/state';

storage.configure({ idb: { name: 'app-kv' } });
state.storage.setDatabaseName('app-state');
```

For tests:

```javascript
state.storage.setDatabaseName('test-db');
```

Because the name is captured before the first `indexedDB.open(...)`, set it during boot or test setup, not halfway through an active app session.

## Related

- [Store](store.md) — `state.create` / hydrate / subscribe
- [Storage](../storage/index.md) — tiered facade
- [Troubleshooting](../storage/troubleshooting.md) — `platform-db` clash
- [API Reference](api.md) — full state API
