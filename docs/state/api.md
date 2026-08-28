# API Reference

Complete reference for the state facade and internal classes.

## Facade

```javascript
import { state } from '@anzaui/anza/state';
```

### `state.create(initial, options)`

Creates a `ReactiveStore`.

```javascript
const store = state.create({ count: 0 }, { deep: false });
```

### `state.derived(compute)`

Creates a `DerivedValue`.

```javascript
const doubled = state.derived(() => store.get('count') * 2);
```

### `state.sync(store, keys, channelName)`

Returns disposer. See [sync.md](sync.md).

### `state.storage`

`PlatformStorage` instance. See [persist.md](persist.md).

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

Register global mutation listener: `(key, value, source) => void`

## DerivedValue

### `value`

Lazy getter. Recomputes if dirty.

### `subscribe(callback)`

Notify when value changes. Returns disposer.

### `dispose()`

Clean up all subscriptions.

## PlatformStorage

### `setDatabaseName(name)`

Configure database name before first use.

### `registerMigrations(migrations)`

Register schema migration functions.

### `get(storeName, key)`

Read a record.

### `set(storeName, key, value, options)`

Write a record. Options: `{ ttl }`.

### `delete(storeName, key)`

Remove a record.

### `query(storeName, filterFn)`

Filter records by predicate.

### `persist()`

Request persistent storage.

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
