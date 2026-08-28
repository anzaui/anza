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

// doubled.value is still 0 — it has not been accessed since the change
console.log(doubled.value); // 10 — recomputes on access
```

Derived values only recompute when accessed after a dependency change. This is lazy evaluation.

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

`total` tracks both `taxRate` and the dependencies of `subtotal`.

## Subscribe to Derived

```javascript
const off = doubled.subscribe(() => {
  console.log('Doubled changed:', doubled.value);
});
```

Subscribe to be notified when the derived value recomputes to a new result.

## Dispose

```javascript
doubled.dispose();
```

Cleans up all internal subscriptions. Call when the derived value is no longer needed to prevent memory leaks.
