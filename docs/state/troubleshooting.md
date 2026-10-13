# Troubleshooting

Common problems and their solutions.

## Subscriber not firing

**Cause:** Setting the same reference, or batching without actual change.

**Fix:** Check that the value actually changed (not `Object.is` equal):

```javascript
// Correct — new value triggers
store.set('count', store.get('count') + 1);

// Wrong — same reference, no trigger
store.set('count', store.get('count'));
```

## Derived value stale

**Cause:** The value was read in the same synchronous block as the write. Store notifications run in a microtask, so the derived value is not yet marked dirty.

**Fix:** Read `.value` after the microtask, for example in a subscriber:

```javascript
store.set('count', 5);
await Promise.resolve();
console.log(doubled.value); // 10
```

## Memory leak with subscribers

**Cause:** Subscribers never removed.

**Fix:** Use disposers or AbortSignal:

```javascript
const off = store.subscribe('count', handler);
off();

// Or with signal
store.subscribe('count', handler, ctrl.signal);
```

## Cross-tab sync not working

**Cause:** `BroadcastChannel` unavailable, or different channel names.

**Fix:** Check that all tabs use the same channel name:

```javascript
// Tab A
store.broadcast('app-sync', ['theme']);

// Tab B — must use same channel
store.broadcast('app-sync', ['theme']);
```

Private browsing may disable `BroadcastChannel`.

## `NotFoundError` from `state.storage`

**Cause:** The object store does not exist. `PlatformStorage` creates no stores by itself.

**Fix:** Register a migration that creates it before the first read or write:

```javascript
state.storage.registerMigrations([(db) => db.createObjectStore('keyval')]);
```

## Expired records still returned

**Cause:** `state.storage.get()` does not check the TTL. Expired records are removed only by quota eviction.

**Fix:** Store your own expiry timestamp in the value and check it after reading. TTL values are in milliseconds.

## Still stuck?

Inspect store state:

```javascript
console.log(store.snapshot());
```
