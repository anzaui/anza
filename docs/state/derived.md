# Derived

`derived` creates lazy, memoized computed values. It tracks which store keys the computation reads, subscribes to those keys, and marks itself dirty when any dependency changes.

## Basic Use

```javascript
import { state } from '@anzaui/anza/state';

const store = state.create({ count: 0 });

const doubled = state.derived(() => store.get('count') * 2);

console.log(doubled.value); // 0
```

The computation runs once on first access. The result is cached.

## Lazy Recomputation

```javascript
store.set('count', 5);
console.log(doubled.value); // still 0: store notifications run in a microtask

await Promise.resolve();
console.log(doubled.value); // 10, recomputed on access
```

A dependency change marks the value dirty when the store flushes its notifications (one microtask after the write). The next `.value` read recomputes. Reading in the same synchronous block as the write returns the cached value.

## Dependency Tracking

During computation, `derived` intercepts all `store.get()` calls:

```javascript
const fullName = state.derived(() => {
  const user = store.get('user'); // tracks 'user' key
  return `${user.first} ${user.last}`;
});
```

`fullName` subscribes to `user`. When `store.set('user', ...)` fires, `fullName` marks itself dirty.

## Nested Derived

Derived values can depend on other derived values:

```javascript
const subtotal = state.derived(() =>
  store.get('items').reduce((s, i) => s + i.price, 0)
);

const total = state.derived(() => {
  const taxRate = store.get('taxRate');
  return subtotal.value * (1 + taxRate);
});
```

`total` tracks `taxRate` and the dependencies `subtotal` has already collected. `subtotal` collects them on its first evaluation, so read `subtotal.value` once before `total` is first evaluated.

## Subscribe to Derived

```javascript
const off = doubled.subscribe(() => {
  console.log('Doubled changed:', doubled.value);
});
```

The callback runs with no arguments when a dependency changes and the value becomes dirty. It does not run again until `.value` is read, so read `.value` inside the callback to keep receiving notifications. Returns a disposer.

## Dispose

```javascript
doubled.dispose();
```

Cleans up all internal subscriptions. Call when the derived value is no longer needed to prevent memory leaks.
