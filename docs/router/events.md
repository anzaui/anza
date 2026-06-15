# Events

The router emits three events: `found`, `notfound`, and `error`. Subscribe with `router.on()`.

---

## Found

Emitted when a route matches successfully:

```javascript
const dispose = router.on('found', (detail) => {
  console.log(detail.tag);        // element tag, e.g. 'page-home'
  console.log(detail.params);     // route params array with getters, e.g. ['42'] with detail.params.id
  console.log(detail.query);      // mapped query params array with getters, e.g. ['profile'] with detail.query.tab
  console.log(detail.raw);        // raw URLSearchParams object for undeclared queries
  console.log(detail.hash);       // hash string, e.g. '#section-2'
  console.log(detail.chain);       // parent chain array
  console.log(detail.url);        // full URL
  console.log(detail.direction);  // 'push', 'replace', 'traverse', or 'load'
});
```

The orchestrator listens to this event and mounts the matched element into its container. You can also listen for analytics, logging, or side effects.

---

## Not Found

Emitted when no route matches:

```javascript
router.on('notfound', ({ url }) => {
  console.warn('No route for', url);
});
```

If a `notFound` handler is registered, it runs after the event:

```javascript
router.notFound((event) => {
  document.body.innerHTML = '<h1>404</h1>';
});
```

---

## Error

Emitted when something goes wrong during navigation:

```javascript
router.on('error', ({ error, url, route, phase }) => {
  console.error(`Navigation failed in phase ${phase}:`, error);
});
```

Phase values:

| Phase | Meaning |
|-------|---------|
| `'match'` | URL matching threw an exception |
| `'container'` | Cascade mounting failed |
| `'guard'` | A guard threw an exception |
| `'handler'` | A callback handler threw an exception |
| `'navigation'` | The Navigation API emitted `navigateerror` |

---

## Subscription and Cleanup

`router.on()` returns a disposer:

```javascript
const dispose = router.on('found', handler);
// later
dispose();
```

You can also pass an `AbortSignal`:

```javascript
const controller = new AbortController();
router.on('found', handler, controller.signal);
controller.abort(); // removes the listener
```

---

## Clearing Listeners

There is no bulk clear for event listeners. Each subscription is independent. Use `AbortController` for grouped cleanup:

```javascript
const ctrl = new AbortController();
router.on('found', handlerA, ctrl.signal);
router.on('error', handlerB, ctrl.signal);

// Remove both at once
ctrl.abort();
```

---

## Event Order

During a successful navigation:

1. Navigation API `navigate` event fires
2. Guards run (pre-commit or post-commit)
3. `match()` resolves the route
4. Cascade ensures container chain
5. View transition starts
6. `found` event emits
7. Orchestrator mounts the element
8. View transition finishes

During a failed navigation:

1. Guard throws or returns redirect
2. `error` event emits with phase `'guard'`
3. Navigation is aborted or redirected

---

## Listening Inside Components

Components can subscribe to router events for coordination:

```javascript
page('/dashboard', {
  tag: 'page-dashboard',
  via: ['main'],
  on: {
    connect({ el }) {
      this._dispose = router.on('found', ({ tag }) => {
        if (tag !== 'page-dashboard') {
          this.pauseLiveUpdates();
        }
      });
    },
    disconnect({ el }) {
      this._dispose?.();
    }
  }
});
```
