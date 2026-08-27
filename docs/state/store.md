# Store

`ReactiveStore` is a Proxy-based reactive state container. It tracks read accesses, batches write notifications, and supports deep reactivity, snapshots, and hydration.

---

## Create

```javascript
import { state } from '@anzaui/anza/state';

const store = state.create({ count: 0 });
```

Options:

| Option | Type | Default | Description |
| -------- | ------ | --------- | ------------- |
| `deep` | boolean | `false` | Enable deep reactivity on nested objects |

```javascript
const store = state.create({ user: { name: 'Alice' } }, { deep: true });

// With deep: true, mutations to nested properties trigger top-level key updates
store.get('user').name = 'Bob'; // triggers 'user' subscribers
```

---

## Get

```javascript
const count = store.get('count');
```

Reading a property via `get` registers the active subscriber (if any) as a dependency. This is how derived values and reactive contexts know what to watch.

---

## Set

```javascript
store.set('count', 5);
store.set('count', 5, 'local'); // with source tag
```

Setting a value to the same reference (via `Object.is`) is a no-op. Setting a different value schedules a notification.

The `source` parameter is used by sync to prevent echo loops. `'local'` means the change originated in this tab.

---

## Subscribe

```javascript
const off = store.subscribe('count', (val, key, prev) => {
  console.log(`${key}: ${prev} -> ${val}`);
});

off(); // unsubscribe
```

| Param | Description |
| ------- | ------------- |
| `val` | New value |
| `key` | The key that changed |
| `prev` | Previous value |

---

## Batch

```javascript
store.batch(() => {
  store.set('a', 1);
  store.set('b', 2);
  store.set('c', 3);
});
```

Multiple sets inside a batch produce a single microtask notification. Subscribers receive the final values.

---

## Snapshot

```javascript
const data = store.snapshot();
```

Returns a deep-cloned copy of the current state. Safe to serialize with `JSON.stringify`.

---

## Hydrate

```javascript
store.hydrate({ count: 10, user: { name: 'Bob' } });
```

Restores state from a snapshot. Uses batch internally, so subscribers fire once for all restored keys.

---

## Reset

```javascript
store.reset({ count: 0 }); // clear all, then set new values
```

---

## Broadcast / Sync

```javascript
store.broadcast('channel-name', ['count', 'user']);
store.sync(['count', 'user'], 'channel-name'); // alias
```

Replicates specified keys across browser tabs. See [sync.md](sync.md).

---

## onMutation

```javascript
store.onMutation((key, value, source) => {
  console.log('Mutated:', key, value, source);
});
```

Called on every mutation. Used internally by `sync` to broadcast changes.
