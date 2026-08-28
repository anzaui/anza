# Events

The router emits three events: `found`, `notfound`, and `error`. Subscribe with `router.on()`. After `notfound` / `error`, the [fallback resolver](fallbacks.md) mounts a leaf into the deepest live dock unless an escape hatch handled it.

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

## Not Found

Emitted when no route matches:

```javascript
router.on('notfound', ({ url }) => {
  console.warn('No route for', url);
});
```

After the event, the resolver mounts the **notfound** leaf into the deepest live dock (shared library built-in, or a dock / `configure` override). Soft-nav does not wipe the shell. Prefer `dock({ notfound })` / `router.pages.configure` over a full handler; see [fallbacks.md](fallbacks.md).

Optional escape hatch (`return false` falls through to auto-mount):

```javascript
router.notFound(async (ctx) => {
  // full manual control — or return false
});
```

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

After the event, the router renders the **error** fallback leaf unless `router.pages.suppressDefault(true)` or an `onError` handler handled it. Explicit offline UI: `router.pages.show('offline')`. See [fallbacks.md](fallbacks.md).

Simple analytics + branded leaf:

```javascript
router.on('error', ({ error, phase }) => {
  reportNavError({ message: error?.message, phase });
});

router.pages.configure({
  error: { tag: 'page-server-error' }
});
```

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

Inside a page leaf, prefer `ctrl.signal` from lifecycle context so soft-nav tears the subscription down with the element.

## Clearing Listeners

There is no bulk clear for event listeners. Each subscription is independent. Use `AbortController` for grouped cleanup:

```javascript
const ctrl = new AbortController();
router.on('found', handlerA, ctrl.signal);
router.on('error', handlerB, ctrl.signal);

// Remove both at once
ctrl.abort();
```

## Event Order

During a successful navigation:

1. Navigation API `navigate` event fires
2. Guards run (pre-commit or post-commit)
3. `match()` resolves the route
4. Cascade ensures container chain
5. View transition starts (dock leaf VT when applicable)
6. `found` event emits
7. Orchestrator mounts the element
8. View transition finishes

During a miss:

1. `match()` returns null
2. `notfound` event emits
3. Fallback resolver mounts notfound leaf into deepest live dock

During a failed navigation:

1. Guard throws or handler fails
2. `error` event emits with the appropriate `phase`
3. Fallback resolver mounts error leaf (unless suppressed / handled)

## Listening Inside Components

Components can subscribe to router events for coordination:

```javascript
page('/dashboard', {
  tag: 'page-dashboard',
  via: ['main'],
  on: {
    connect({ el, ctrl }) {
      this._dispose = router.on('found', ({ tag }) => {
        if (tag !== 'page-dashboard') {
          this.pauseLiveUpdates();
        }
      }, ctrl.signal);
    }
  }
});
```

Prefer `ctrl.signal` over a manual disposer in `disconnect` — soft-nav aborts the leaf controller automatically.

## Related

- [fallbacks.md](fallbacks.md) — leaf mount after miss / error
- [guards.md](guards.md) — throws → `error` with `phase: 'guard'`
- [api.md](api.md) — `router.on` / `router.pages`
- [events/troubleshooting.md](../events/troubleshooting.md) — soft-nav orphans (app event bus)
