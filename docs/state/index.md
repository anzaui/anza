# State

The Anza state layer provides reactive in-memory stores, lazy computed values, cross-tab synchronization, and transactional IndexedDB persistence. It is built on JavaScript Proxies for fine-grained reactivity without virtual DOM overhead.

---

## What You Get

- **Reactive stores** — Proxy-based state with automatic dependency tracking and microtask-batched updates
- **Derived values** — Lazy, memoized computations that track their own dependencies
- **Cross-tab sync** — BroadcastChannel replication of store mutations across browser tabs
- **Persistence** — IndexedDB-backed storage with migrations, TTL, and quota-aware eviction

---

## Package

```javascript
import { state } from '@anzaui/anza/state';
```

---

## File Map

| File | What It Covers |
| ----- | --------------- |
| [quickstart.md](quickstart.md) | Your first store in five minutes |
| [store.md](store.md) | ReactiveStore — get, set, subscribe, batch, snapshot |
| [derived.md](derived.md) | Lazy computed values and dependency tracking |
| [sync.md](sync.md) | Cross-tab state replication |
| [persist.md](persist.md) | IndexedDB persistence, migrations, TTL |
| [api.md](api.md) | Complete API reference |
| [troubleshooting.md](troubleshooting.md) | Common problems and how to fix them |

---

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

// Derived value
const doubled = state.derived(() => store.get('count') * 2);
console.log(doubled.value); // 20

// Sync across tabs
store.broadcast('app-state', ['count', 'user']);

// Persist to IndexedDB
state.storage.set('keyval', 'count', store.get('count'));
```

---

## Next Steps

- New to the state layer? Start with [quickstart.md](quickstart.md).
- Building reactive UI? Read [store.md](store.md) and [derived.md](derived.md).
- Multi-tab app? [sync.md](sync.md).
- Need persistence? [persist.md](persist.md).
- Prefer a single reference page? [api.md](api.md).
