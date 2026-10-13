# Quick Start

Get a reactive store running in five minutes.

## 1. Create a Store

```javascript
import { state } from '@anzaui/anza/state';

const store = state.create({
  count: 0,
  user: null,
  items: []
});
```

The store wraps the object in a Proxy. Reading a key inside a derived computation tracks it. Writing a key notifies its subscribers in a microtask.

## 2. Read and Write

```javascript
// Read
console.log(store.get('count')); // 0

// Write
store.set('count', 5);
console.log(store.get('count')); // 5
```

## 3. Subscribe to Changes

```javascript
const off = store.subscribe('count', (val, key, prev) => {
  console.log(`${key} changed: ${prev} -> ${val}`);
});

store.set('count', 10); // "count changed: 5 -> 10"

off(); // unsubscribe
```

Subscribers receive the new value, key name, and previous value.

## 4. Batch Updates

```javascript
store.batch(() => {
  store.set('count', 1);
  store.set('count', 2);
  store.set('count', 3);
});
// Subscribers fire once with the final value
```

## 5. Derived Values

```javascript
const total = state.derived(() => {
  const items = store.get('items');
  return items.reduce((sum, item) => sum + item.price, 0);
});

console.log(total.value); // computed lazily, memoized
```

The derived value tracks which store keys it reads. When a dependency changes, it is marked dirty once the store flushes its notifications (a microtask later) and recomputes on the next access.

## 6. Snapshot and Hydrate

```javascript
// Serialize
const snapshot = store.snapshot();

// Restore
store.hydrate(snapshot);
```

`snapshot` returns a deep clone. `hydrate` restores without firing redundant triggers.

## 7. Cross-Tab Sync

```javascript
store.broadcast('app-sync', ['count', 'user']);
```

Mutations to `count` and `user` replicate to other tabs via BroadcastChannel.

## 8. Persist to IndexedDB

```javascript
// Create the object store once, before the first read or write
state.storage.registerMigrations([(db) => db.createObjectStore('keyval')]);

await state.storage.set('keyval', 'count', store.get('count'));
const restored = await state.storage.get('keyval', 'count');
```

## Complete Working Example

```javascript
import { state } from '@anzaui/anza/state';

const cart = state.create({ items: [], total: 0 });

// Auto-recalculate total when items change
const computedTotal = state.derived(() => {
  return cart.get('items').reduce((sum, item) => sum + item.price, 0);
});

// Subscribe to total changes
cart.subscribe('items', () => {
  console.log('Cart total:', computedTotal.value);
});

// Set a new array: setting the same array reference does not notify
cart.set('items', [...cart.get('items'), { name: 'Widget', price: 9.99 }]);

// Sync across tabs
cart.broadcast('cart-sync', ['items']);
```
