# Native State Usage Guide

The Native State layer provides a lightweight, reactive, and persistent state management engine. It encapsulates reactive stores, opt-in deep tracking, derived computations, cross-tab synchronization, transaction-safe IndexedDB persistence, automated TTL/LRU cache eviction, and build-time store immutability validation.

Status: this guide documents the implemented public state contract: `state.create`, `ReactiveStore`, `derived`, `sync`, `storage`, `PlatformStorage`, deep reactivity, custom snapshots/cloners, transaction queues, and the build-time immutability linter.

Import from the state entry point:

```javascript
import { state } from '@anzaui/anza/state';
```

Or import individual components directly:

```javascript
import { ReactiveStore, derived, sync, storage } from '@anzaui/anza/state';
```

---

## 1. Choosing an API

| Need | Use |
| --- | --- |
| Initialize a reactive store | `state.create` or `new ReactiveStore` |
| Get a store property | `store.get` |
| Update a store property | `store.set` |
| Subscribe to property changes | `store.subscribe` |
| Clear or initialize state | `store.reset` |
| Restore state from snapshot | `store.hydrate` |
| Capture a cloned snapshot | `store.snapshot` |
| Opt-in nested object tracking | `options.deep` |
| Sync properties across tabs | `store.sync` or `state.sync` |
| Sync property with channel | `store.broadcast` or `state.broadcast` |
| Computed read-only state | `store.derived` or `state.derived` |
| Connect to IndexedDB storage | `storage` or `new PlatformStorage` |
| Store value in disk cache | `storage.set` |
| Retrieve value from disk cache | `storage.get` |
| Delete disk cache entry | `storage.delete` |
| Query disk cache entries | `storage.query` |
| Schema migrations | `storage.registerMigrations` |
| Disk space estimate | `storage.estimate` |
| Request persistent storage | `storage.persist` |

---

## 2. Store Creation

Use `state.create(initial, options)` or `new ReactiveStore(initial, options)` to construct a reactive store.

```javascript
const store = state.create({
  active: false,
  items: []
});
```

Available options:

```javascript
const store = new ReactiveStore({
  user: { name: 'Alice', address: { city: 'Paris' } }
}, {
  deep: true,                  // Enable deep reactivity proxying (default: false)
  clone: (val) => myClone(val) // Custom cloner for snapshots (default: optimized fastClone)
});
```

Rules:

- Pass plain objects or values that are structured-clone-safe.
- Custom cloners override the default snapshot copy behavior (useful for non-standard classes or complex structures).

---

## 3. Reading and Writing

Read values using `store.get(key)` and update values using `store.set(key, value)`.

```javascript
// Reading properties
const active = store.get('active');

// Writing properties
store.set('active', true);
```

Writes are batched and scheduled to notify subscribers inside a microtask. If you need to perform multiple updates sequentially without triggering multiple subscriber notifications, group them using `store.batch()`.

```javascript
store.batch(() => {
  store.set('active', true);
  store.set('items', [1, 2, 3]);
});
// Subscribers are notified exactly once after the batch completes.
```

---

## 4. Subscription Management

Use `store.subscribe(key, callback, signal?)` to listen to property changes.

```javascript
const dispose = store.subscribe('active', (next, key, prev) => {
  console.log(`${key} changed from ${prev} to ${next}`);
});

// Teardown the subscription
dispose();
```

When integrating subscriptions inside component lifecycles, pass an `AbortSignal` to ensure automatic cleanup on unmount:

```javascript
ui.element('ui-panel', {
  mount({ el, ctrl }) {
    store.subscribe('active', (active) => {
      el.toggleAttribute('active', active);
    }, ctrl.signal);
  }
});
```

Rules:

- Subscriber callbacks receive `(next, key, prev)` — the current value, the key that changed, and the previous value.
- A callback subscribed to several keys is invoked once per flush, with one of the changed keys.
- Callbacks run asynchronously on microtask ticks unless batching is active.
- Aborted signals automatically clean up and remove the subscriber from the registry.

---

## 5. Deep Reactivity

By default, stores only track top-level property assignments. Set `deep: true` to enable tracking of nested mutations:

```javascript
const store = new ReactiveStore({
  profile: { name: 'Bob', settings: { theme: 'dark' } }
}, { deep: true });

store.subscribe('profile', (next) => {
  console.log('Profile changed:', next.settings.theme);
});

// Mutating a nested key triggers the parent "profile" subscription
store.get('profile').settings.theme = 'light';
```

Under the hood:

- The store wraps objects recursively in reactive `Proxy` traps.
- Mutations propagate up to mark the top-level keys as dirty.
- Mutated objects are cached in a `WeakMap` to avoid redundant proxy allocations.

---

## 6. Snapshots and Cloners

Use `store.snapshot()` to extract a copy of the entire current state. You can restore this state later using `store.hydrate(state)` or clear it using `store.reset(state)`.

```javascript
const backup = store.snapshot();

// Clear and override the current state
store.reset({ active: false });

// Restore the backup
store.hydrate(backup);
```

Cloning strategies:

- The default cloner uses an optimized `fastClone` path that avoids the overhead of JSON parsing or standard `structuredClone` for plain objects, arrays, and primitives. It falls back to constructor-based cloning for Date and RegExp.
- Provide a custom `clone` function in store options to handle domain-specific object structures.

---

## 7. Derived Computations

Use `derived` to calculate read-only computed values that automatically react to store changes.

```javascript
const store = state.create({ count: 2, price: 10 });

// Define derived state using state.derived (standalone)
const total = state.derived(() => {
  return store.get('count') * store.get('price');
});

// Or using store.derived (instance method)
const total = store.derived(() => {
  return store.get('count') * store.get('price');
});

console.log(total.value); // 20

// Derived state is an observable exposing .value
const stop = total.subscribe((next) => {
  console.log(`New total: ${next}`);
});

store.set('count', 3); // Triggers derived recalculation. total.value becomes 30.

stop();
```

Rules:

- Derived functions capture store getters called during execution to automatically track dependencies.
- Subscriptions are dynamically added and removed as dependencies execute.
- Computation updates are batched and scheduled in microtasks.

---

## 8. Cross-Tab Sync

Use the `sync` or `broadcast` delegates to coordinate state changes between multiple open browser tabs.

### State Synchronization

Sync coordinates state changes across same-origin tabs for specific keys using a BroadcastChannel:

```javascript
// Using state.sync (standalone)
const stop = state.sync(store, ['theme', 'token'], {
  channel: 'app-state-sync' // Optional custom channel name
});

// Using store.sync (instance method)
const stop = store.sync(['theme', 'token'], 'app-state-sync');

// To stop synchronization
stop();
```

### Broadcast Messaging

Use `broadcast` to emit specific key modifications or messages down a BroadcastChannel:

```javascript
// Using state.broadcast (standalone)
const stop = state.broadcast(store, 'chat-events', ['message']);

// Using store.broadcast (instance method)
const stop = store.broadcast('chat-events', ['message']);

store.subscribe('message', (msg) => {
  console.log('Sending message down channel:', msg);
});

stop();
```

---

## 9. Disk Persistence Layer

Use `storage` (an instance of `PlatformStorage`) to store data persistently in IndexedDB.

```javascript
// Register schema migrations
storage.registerMigrations([
  (db) => {
    db.createObjectStore('settings');
  }
]);

await storage.open();

// Write to store
await storage.set('settings', 'theme', 'dark');

// Read from store
const theme = await storage.get('settings', 'theme');

// Delete from store
await storage.delete('settings', 'theme');
```

For custom database instances, construct your own `PlatformStorage`:

```javascript
const myDB = new PlatformStorage();
myDB.setDatabaseName('custom-platform-db');
myDB.registerMigrations([
  (db) => {
    db.createObjectStore('cache');
  }
]);
await myDB.open();
```

---

## 10. Transaction Queuing & Retries

All database writes (`set`, `delete`) are routed through a sequence-preserving `WriteQueue` to prevent transaction conflicts.

```javascript
// Concurrent writes are queued sequentially
await Promise.all([
  storage.set('settings', 'key1', 'val1'),
  storage.set('settings', 'key2', 'val2')
]);
```

Features:

- **Write Ordering**: Guarantees that writes resolve in the exact order they were requested.
- **Auto-Retries**: If a write fails due to transient locks or database errors, the queue retries the operation up to 3 times with exponential backoff delays.

---

## 11. Cache Eviction & Space Recovery

`PlatformStorage` automatically wraps stored items inside metadata envelopes:

```javascript
{
  value: any,
  lastAccessed: number,
  expires: number | null
}
```

This supports advanced storage pruning strategies:

### Time-to-Live (TTL) Eviction

Specify a TTL (in milliseconds) during `set` to automatically expire records.

```javascript
// Expire after 10 seconds
await storage.set('settings', 'token', 'abc', { ttl: 10000 });
```

Expired records are automatically pruned from the database when new keys are written or checked.

### Least Recently Used (LRU) Eviction

When origin storage usage exceeds **80%** of the browser allocation:

1. A global `'quota'` event is dispatched on the `window` object containing the current `usage` and `quota`.
2. The storage layer automatically deletes expired records first.
3. If the ratio remains above 80%, it sorts active records by `lastAccessed` and evicts the oldest entries until usage falls below the threshold.

```javascript
window.addEventListener('quota', (event) => {
  const { usage, quota } = event.detail;
  console.warn(`Storage space warning: ${usage} bytes used out of ${quota}`);
});
```

---

## 12. Build-Time Immutability Warnings

Directly mutating properties retrieved from a store causes side-effects and breaks clean subscription flows. The compiler tools include an SWC-powered `ImmutabilityVisitor` to catch these issues at build-time.

### Bad Practice (Triggers Warning)

```javascript
const user = store.get('user');
user.name = 'Dave'; // Static compiler warning! Mutating store variable directly.
```

### Good Practice

```javascript
const user = store.snapshot().user;
user.name = 'Dave';
store.set('user', user); // Correct: update via set()
```

When building or running in dev mode, the compiler logs warnings:

```text
[WARN] Immutability Violation in src/elements/profile.js: mutating property 'name' of store-retrieved variable 'user' directly. Use store.set() instead.
```

---

## 13. Testing State Code

### Stubbing Storage Quota

To test LRU eviction behavior under storage pressure, stub `navigator.storage.estimate` and dispatcher handlers:

```javascript
let quotaFired = false;
const onQuota = () => { quotaFired = true; };
window.addEventListener('quota', onQuota);

const originalEstimate = navigator.storage?.estimate;
if (navigator.storage) {
  navigator.storage.estimate = async () => ({
    quota: 1000,
    usage: 850 // >80% threshold
  });
}

// Perform writes and verify eviction behavior...

window.removeEventListener('quota', onQuota);
navigator.storage.estimate = originalEstimate;
```

### Resetting Stores Between Tests

Always reset or clear stores and databases in test setup/teardown blocks:

```javascript
beforeEach(() => {
  store.reset({ active: false });
});

afterEach(async () => {
  // Delete the test IndexedDB database
  await new Promise((resolve) => {
    const req = indexedDB.deleteDatabase('test-platform-db');
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
  });
});
```

---

## 14. Checklist

- Use `state.create()` to instantiate reactive stores.
- Use `store.batch()` when writing multiple keys sequentially to avoid redundant notifications.
- Use `store.subscribe()` to listen to updates, and pass `AbortSignal` for automated component lifecycle cleanup.
- Enable `deep: true` in options only if you need to track nested object mutations directly.
- Use `state.derived()` to represent computed, dependency-tracked read-only state.
- Keep store mutations out of direct assignments on values returned from `store.get()`. Use `store.snapshot()` or update via `store.set()`.
- Register migrations via `storage.registerMigrations` sequentially in order to set up your IndexedDB stores correctly.
- Clean up test databases and reset store states inside `afterEach` hooks to prevent cross-test data pollution.
