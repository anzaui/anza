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

**Cause:** The derived value was not accessed after a dependency changed.

**Fix:** Derived values recompute lazily. Access `.value` after changes:

```javascript
store.set('count', 5);
console.log(doubled.value); // forces recompute
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

## IndexedDB blocked

**Cause:** Another tab has the database open with an older version.

**Fix:** Listen for the `storage:blocked` event:

```javascript
window.addEventListener('storage:blocked', () => {
  console.warn('IDB upgrade blocked — close other tabs');
});
```

## TTL entries returning null

**Cause:** Entry expired between set and get.

**Fix:** Check timestamps. TTL is in milliseconds:

```javascript
// Correct — 60 seconds
await state.storage.set('keyval', 'token', data, { ttl: 60000 });

// Wrong — 60 is 60 milliseconds
await state.storage.set('keyval', 'token', data, { ttl: 60 });
```

## Still stuck?

Inspect store state:

```javascript
console.log(store.snapshot());
console.log('Subscribers:', doubled['#listeners']); // not exposed — use subscribe instead
```
