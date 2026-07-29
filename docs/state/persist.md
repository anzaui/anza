# Persist

`PlatformStorage` provides transactional IndexedDB persistence for reactive state. It supports schema migrations, TTL-based expiry, and automatic eviction when storage quota exceeds 80%.

This is **not** the tiered `@adukiorg/anza/storage` facade. Prefer `state.storage` for hydrating `state.create` stores; use the storage package for general KV, OPFS, and Cache API. Give each a distinct DB name if both are open (see [storage/troubleshooting.md](../storage/troubleshooting.md)).

---

## Bridge pattern

Hydrate a store from IndexedDB, then persist on change. Prefer this over inventing a second persistence layer with `@adukiorg/anza/storage` for the same keys.

```javascript
import { state } from '@adukiorg/anza/state';

const store = state.create({ user: null });

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
| General KV, blobs, OPFS, Cache API, tier selection | `@adukiorg/anza/storage` |

Mixing both is fine, but treat them as separate persistence systems with separate database names.

---

## Basic Use

```javascript
import { state } from '@adukiorg/anza/state';

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
| `get(storeName, key)` | Read one record (expired entries resolve to `null`) |
| `delete(storeName, key)` | Remove one record |
| `query(storeName, predicate?)` | Read all records and filter in JS |
| `registerMigrations([...])` | Define sequential schema upgrades before first open |
| `setDatabaseName(name)` | Isolate the DB name before first open |
| `persist()` / `isPersisted()` | Ask the browser for persistent storage |

---

## Schema Migrations

Register migration functions before opening the database:

```javascript
state.storage.registerMigrations([
  (db, tx) => {
    // Version 1 -> 2
    db.createObjectStore('settings');
  },
  (db, tx) => {
    // Version 2 -> 3
    db.createObjectStore('sessions');
  }
]);
```

Migrations run sequentially inside `onupgradeneeded`. Each function corresponds to one version step.

Call `registerMigrations()` before any `get()` / `set()` opens IndexedDB. Once the first connection is live, changing the migration list in the same session will not re-run already-open upgrades.

---

## TTL

```javascript
// Cache for 60 seconds
await state.storage.set('keyval', 'token', 'abc123', { ttl: 60000 });

// After expiry, get returns null
await state.storage.get('keyval', 'token'); // null if expired
```

TTL is stored on the record envelope alongside `lastAccessed`. Reads unwrap the record value for you, so consumers only see the stored payload or `null`.

---

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

---

## Query (filter function)

Unlike `@adukiorg/anza/storage` cursor `query`, `state.storage.query` takes a **predicate**:

```javascript
const items = await state.storage.query('keyval', (value) => {
  return value && value.active === true;
});
```

Returns all records matching the filter function.

This is intentionally different from `storage.query(...)` in the storage facade, which exposes IndexedDB cursor options. `state.storage.query()` is the simpler "load and filter values" path for app state.

---

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

---

## Database Name

Call **before** the first open. Required when you also use `@adukiorg/anza/storage` (both default to `platform-db`):

```javascript
import { storage } from '@adukiorg/anza/storage';
import { state } from '@adukiorg/anza/state';

storage.configure({ idb: { name: 'app-kv' } });
state.storage.setDatabaseName('app-state');
```

For tests:

```javascript
state.storage.setDatabaseName('test-db');
```

Because the name is captured before the first `indexedDB.open(...)`, set it during boot or test setup, not halfway through an active app session.

---

## Related

- [store.md](store.md) — `state.create` / hydrate / subscribe
- [storage/index.md](../storage/index.md) — tiered facade
- [storage/troubleshooting.md](../storage/troubleshooting.md) — `platform-db` clash
- [api.md](api.md) — full state API
