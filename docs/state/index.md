---
title: "State"
order: 7
---

# State

The Anza state layer provides reactive in-memory stores, lazy computed values, cross-tab synchronization, and transactional IndexedDB persistence. Stores are built on JavaScript Proxies.

## What You Get

- **Reactive stores** — Proxy-based state with automatic dependency tracking and microtask-batched updates
- **Derived values** — Lazy, memoized computations that track their own dependencies
- **Cross-tab sync** — BroadcastChannel replication of store mutations across browser tabs
- **Persistence** — IndexedDB-backed storage with migrations, TTL, and quota-aware eviction

## Package

```javascript
import { state } from '@anzaui/anza/state';
```

## File Map

| File | What It Covers |
| ----- | --------------- |
| [Quick Start](quickstart.md) | Your first store in five minutes |
| [Store](store.md) | ReactiveStore — get, set, subscribe, batch, snapshot |
| [Derived](derived.md) | Lazy computed values and dependency tracking |
| [Sync](sync.md) | Cross-tab state replication |
| [Persist](persist.md) | IndexedDB persistence, migrations, TTL |
| [API Reference](api.md) | Complete API reference |
| [Troubleshooting](troubleshooting.md) | Common problems and how to fix them |

## One-File Example

```javascript
import { state } from '@anzaui/anza/state';

// Create a reactive store
const store = state.create({ count: 0, user: null });

// Subscribe to a key
const off = store.subscribe('count', (val, key, prev) => {
  console.log(`${key}: ${prev} -> ${val}`);
});

// Set triggers subscribers
store.set('count', 5); // logs "count: 0 -> 5"

// Batch multiple changes
store.batch(() => {
  store.set('count', 10);
  store.set('user', { name: 'Alice' });
});
// One notification batch for both changes

// Derived value (the batched writes above are already applied)
const doubled = state.derived(() => store.get('count') * 2);
console.log(doubled.value); // 20

// Sync across tabs
store.broadcast('app-state', ['count', 'user']);

// Persist to IndexedDB (create the object store first)
state.storage.registerMigrations([(db) => db.createObjectStore('keyval')]);
state.storage.set('keyval', 'count', store.get('count'));
```

## Next Steps

- New to the state layer? Start with [Quick Start](quickstart.md).
- Building reactive UI? Read [Store](store.md) and [Derived](derived.md).
- Multi-tab app? [Sync](sync.md).
- Need persistence? [Persist](persist.md).
- Prefer a single reference page? [API Reference](api.md).
