# API Reference

Complete reference for the router facade and definition layer.

---

## Router Facade

### `router.register(pattern, handler, meta)`

Register a route. Returns nothing.

| Param | Type | Description |
| ----- | ---- | ----------- |
| `pattern` | string | URL pattern or absolute URL |
| `handler` | string \| function \| object | See [handlers.md](handlers.md) |
| `meta` | object | Optional metadata (`container`, `parent`, `via`) |

```javascript
router.register('/', 'page-home');
router.register('/user/:id', 'page-user', { container: 'main' });
```

### `router.load(routes)`

Bulk register from an array of `{ pattern, handler, meta }` objects.

```javascript
router.load([
  { pattern: '/', handler: 'page-home', meta: { container: 'main' } }
]);
```

### `router.clear()`

Remove all registered routes.

### `router.match(url)`

Match a URL against registered routes. Returns a promise resolving to:

```javascript
{
  route,    // matched route entry
  tag,      // resolved element tag (or null for callbacks)
  params,   // route parameters
  query,    // query object
  hash,     // hash string
  chain,    // parent chain array
  result    // URLPattern exec result
}
```

Returns `null` on no match.

### `router.guard(fn)`

Register a global navigation guard. Returns a disposer.

```javascript
const dispose = router.guard((destination, controller) => {
  if (blocked) return '/login';
});
dispose(); // remove
```

### `router.guards.add(fn)`

Same as `router.guard(fn)`.

### `router.guards.clear()`

Remove all guards.

### `router.notFound(fn)`

Set a full escape-hatch handler for unmatched routes (skips automatic leaf mount). Returns a disposer.

```javascript
router.notFound((event) => {
  // custom mount — or prefer router.pages.configure({ notfound: { tag } })
});
```

### `router.pages`

Optional app-level fallback tags / HTML for `notfound`, `error`, and `offline` when no dock in the chain defines the kind. Bare docks already use shared library built-ins — see [fallbacks.md](fallbacks.md).

```javascript
router.pages.configure({
  notfound: { tag: 'page-not-found' },
  error: { tag: 'page-server-error' }
});
router.pages.show('offline');
router.pages.onError(async (ctx) => { /* return false to fall through */ });
```

`configure()` returns a disposer that clears only the kinds you set in that call. `show(kind, ctx)` renders into the deepest live dock in the active `via` / `lastVia` chain and honors `ctx.signal` for aborted soft-nav work. `suppressDefault(true)` disables automatic error mounting while leaving manual `show('error', ...)` available.

### `router.miss.set(fn)`

Same as `router.notFound(fn)`.

### `router.miss.clear()`

Remove the not-found handler.

### `router.on(event, callback, signal)`

Subscribe to router events. Returns a disposer.

Events: `'found'`, `'notfound'`, `'error'`.

```javascript
const dispose = router.on('found', (detail) => { ... });
dispose();
```

### `router.navigate(url, options)`

Push a new history entry. Returns `{ committed, finished }`.

```javascript
router.navigate('/settings');
router.navigate('/settings', { state: { tab: 'profile' } });
```

### `router.replace(url, options)`

Replace the current history entry.

### `router.back()`

Go back one history step.

### `router.forward()`

Go forward one history step.

### `router.go(delta)`

Traverse by an arbitrary delta.

### `router.current()`

Returns the current `NavigationHistoryEntry`.

### `router.entries()`

Returns the full history entry list.

### `router.canBack()`

Returns `true` if backward traversal is possible.

### `router.canForward()`

Returns `true` if forward traversal is possible.

### `router.nav.to(url)`

Chainable navigation promise.

```javascript
router.nav.to('/settings').then(() => { ... });
```

### `router.getContainer(name)`

Resolve a container by registry key or CSS selector.

### `router.registerContainer(name, element, parent)`

Manually register a container in the graph.

### `router.unregisterContainer(name, element)`

Manually unregister a container.

### `router.clearContainers()`

Clear the entire container registry.

### `router.cache.get(url)`

Read a cached response.

### `router.cache.set(url, response, ttl)`

Store a response in the cache.

### `router.cache.prefetch(url, options)`

Prefetch a URL into the cache.

### `router.cache.purge(url?)`

Purge one URL or the entire cache.

### `router.sync.start()`

Start cross-tab sync.

### `router.sync.stop()`

Pause cross-tab sync.

### `router.sync.active()`

Returns `true` if sync is running.

### `router.sync.close()`

Stop sync and close the BroadcastChannel.

### `router.setup()`

Attach navigation listeners. Idempotent.

### `router.destroy()`

Remove all listeners and reset internal state.

---

## Definition Layer

### `page(route, config, base)`

Define a route-bound element.

```javascript
page('/user/:id', {
  tag: 'page-user',
  via: ['main'],
  template: { html: './user.html', css: './user.css' },
  params: [
    { name: 'id', type: Number }
  ]
}, import.meta.url);
```

Config fields: `tag`, `via`, `container`, `template`, `style`, `props`, `params`, `query`, `hash`, `on`, `guard`, `meta`.

### `dock(name, config, base)`

Define a persistent container shell.

```javascript
dock('main', {
  template: '<slot></slot>',
  params: [],
  query: [],
  notfound: { tag: 'page-not-found' },
  error: { tag: 'page-server-error' }
});
```

Config fields: `tag`, `parent`, `template`, `style`, `params`, `query`, `on`, `notfound`, `error`, `offline`.

Default tag: `dock-<name>`. Default parent: `'body'`.

### `view(tag, config, base)`

Define a stateful component.

```javascript
view('user-card', {
  props: { name: { type: String } },
  template: '<span>{{ name }}</span>'
});
```

### `part(tag, config, base)`

Define a stateless primitive.

```javascript
part('icon-star', {
  props: { color: { type: String } },
  template: '<svg>...</svg>'
});
```

---

## Internal Exports

For middleware and test utilities:

```javascript
import { register, match, clear, getRoutes, load } from '@anzaui/anza/router';
import { addGuard, setNotFound, on, setup, destroy } from '@anzaui/anza/router';
import { navigate, replace, back, forward, go } from '@anzaui/anza/router';
import { gate, boot, ready, reset } from '@anzaui/anza/router';
import { isCallback, resolveTag, runCallback } from '@anzaui/anza/router';
import { transitions } from '@anzaui/anza/router';
```

### `transitions`

Router facade over the UI View Transitions core. Soft-nav docks use **element-scoped** VT via `dock.swap` / `runSwap` — never document VT. Use `run` only for explicit document morphs.

```javascript
import { transitions } from '@anzaui/anza/router';

transitions.configure({ enabled: true });
transitions.dockName(null, 'content'); // → 'dock-content'
await transitions.runSwap(host, () => host.replaceChildren(leaf), {
  dockName: 'content',
  direction: 'push',
  signal: ctrl.signal
});
await transitions.run(() => panel.replaceChildren(next), {
  sourceElement: card,
  name: 'selected-card',
  signal: ctrl.signal
});
```

| Member | Role |
| ------ | ---- |
| `configure` / `getConfig` | Global enable + name resolver |
| `runSwap` | Element-scoped dock swap (same as `ui.runSwapTransition`) |
| `run` | Document morph + token sheet inject |
| `dockName` | Default `dock-<registryKey>` |
| `prefersReducedMotion` | Motion preference helper |

Full behaviour: [transitions.md](transitions.md), [ui/transitions.md](../ui/transitions.md).
