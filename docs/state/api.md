# API Reference

Complete reference for the state facade and internal classes.

## Facade

```javascript
import { state } from '@anzaui/anza/state';
```

### `state.create(initial, options)`

Creates a `ReactiveStore`. Options: `deep` (boolean, default `false`) and `clone` (function used by `snapshot()`).

```javascript
const store = state.create({ count: 0 }, { deep: false });
```

### `state.derived(compute)`

Creates a `DerivedValue`.

```javascript
const doubled = state.derived(() => store.get('count') * 2);
```

### `state.sync(store, keys, channelName)`

Returns disposer. See [Sync](sync.md).

### `state.storage`

`PlatformStorage` instance. See [Persist](persist.md).

## ReactiveStore

### `get(key)`

Read a property value.

### `set(key, value, source)`

Write a property value. `source` defaults to `'local'`.

### `subscribe(key, callback, signal)`

Subscribe to a key. Returns disposer.

Callback: `(val, key, prev) => void`

### `batch(fn)`

Batch multiple mutations into one notification.

### `snapshot()`

Returns deep-cloned current state.

### `hydrate(data)`

Restore state from a snapshot.

### `reset(initial)`

Clear all keys, then set from initial object.

### `broadcast(channelName, keys)`

Sync keys across tabs. Returns disposer.

### `sync(keys, channelName)`

Alias for `broadcast`.

### `onMutation(callback)`

Set the store's mutation listener: `(key, value, source) => void`. A store holds one listener; `broadcast` and `sync` replace it.

### `derived(keys, compute)`

Same as `state.derived(compute)`. `keys` is ignored; dependencies are tracked from the reads. `derived(compute)` also works.

## DerivedValue

### `value`

Lazy getter. Recomputes if dirty.

### `subscribe(callback)`

Called with no arguments when a dependency changes and the value becomes dirty. Returns disposer.

### `dispose()`

Clean up all subscriptions.

## PlatformStorage

### `setDatabaseName(name)`

Configure database name before first use.

### `registerMigrations(migrations)`

Register schema migration functions `(db, tx) => void`. Function `i` upgrades to version `i + 1`. No object store exists until a migration creates it.

### `get(storeName, key)`

Read a record.

### `set(storeName, key, value, options)`

Write a record. Options: `{ ttl }` (milliseconds). `get` does not check the TTL; expired records are removed only by quota eviction.

### `delete(storeName, key)`

Remove a record.

### `query(storeName, filterFn)`

Filter records by predicate.

### `open()`

Open the database. The other methods call it for you.

### `estimate()`

Returns `navigator.storage.estimate()`, or `{ quota: 0, usage: 0 }` when unavailable.

### `persist()`

Request persistent storage. Resolves to a boolean.

### `isPersisted()`

Whether the origin's storage is persistent.

## Named Exports

```javascript
import {
  ReactiveStore,
  setActiveSubscriber,
  getActiveSubscriber,
  derived,
  sync,
  PlatformStorage,
  storage
} from '@anzaui/anza/state';
```
