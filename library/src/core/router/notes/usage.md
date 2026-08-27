# Native Router Usage Guide

The Native Router layer owns same-document navigation for browser-native applications. It registers URL patterns, matches paths with `URLPattern`, intercepts Navigation API events, runs guards, emits route lifecycle events, coordinates named UI containers, synchronizes duplicate tabs, and opens or closes route-scoped background connections.

Status: this guide documents the implemented public router contract: `router.register`, `router.load`, `router.match`, `router.clear`, `router.guard`, `router.guards`, `router.notFound`, `router.miss`, `router.on`, `router.nav.to`, history wrappers, container registry APIs, `router.sync`, `router.links`, connection coordination APIs, and declarative `ui.element` / `ui.container` integration.

Import from the router entry point:

```javascript
import { router } from '@anzaui/anza/router';
```

Named exports are also available:

```javascript
import {
  register,
  load,
  match,
  navigate,
  replace,
  back,
  forward,
  on,
  nav
} from '@anzaui/anza/router';
```

## 1. Choosing an API

| Need | Use |
|------|-----|
| Register a route | `router.register` |
| Bulk register routes from JSON | `router.load` |
| Match a URL manually | `router.match` |
| Remove all routes | `router.clear` |
| Protect navigation | `router.guard` |
| Manage guards | `router.guards` |
| Handle unmatched routes | `router.notFound` |
| Manage unmatched-route handler | `router.miss` |
| Listen to route events | `router.on` |
| Navigate with callbacks | `router.nav.to` |
| Navigate directly | `router.navigate` |
| Replace current URL | `router.replace` |
| Traverse history | `router.back`, `router.forward`, `router.go` |
| Read history state | `router.current`, `router.entries` |
| Register a layout target | `router.registerContainer` |
| Route with UI components | `ui.element`, `ui.container` |
| Route-scoped connections | `router.links`, `router.registerConnection` |
| Prefetch route assets | `router.prefetch` |
| Manage the route cache | `router.cache` |
| Cross-tab route sync | `router.sync` |
| Navigation listener teardown | `router.destroy` |

## 2. Route Registration

Use `router.register(pattern, handler, meta)` to add a route.

```javascript
router.register('/dashboard', 'page-dashboard');
router.register('/members/:member', 'page-member');
router.register('/files/*', 'page-files');
```

The handler is usually a tag name string.

```javascript
router.register('/settings', 'page-settings');
```

It can also be a zero-argument function that returns a tag name. This is useful for lazy resolution.

```javascript
router.register('/reports', async () => {
  await import('/pages/reports.js');
  return 'page-reports';
});
```

Route metadata is stored on the route entry and is used by the router and UI integration.

```javascript
router.register('/members/:member', 'page-member', {
  container: 'main',
  title: 'Member'
});
```

### Bulk Route Loading

Use `router.load(routesData)` to register multiple routes from a JSON array or object. This is useful for loading route definitions from a configuration file or API response.

```javascript
// Load from an array
router.load([
  { pattern: '/dashboard', handler: 'page-dashboard', meta: { container: 'main' } },
  { pattern: '/members/:member', handler: 'page-member', meta: { container: 'main' } },
  { pattern: '/files/*', handler: 'page-files', meta: { container: 'main' } }
]);

// Load from a single object
router.load({
  pattern: '/settings',
  handler: 'page-settings',
  meta: { container: 'main' }
});
```

`router.load` accepts the same handler shapes as `router.register` (tag strings, lazy factories, callbacks, or object forms).

### Handler contract

A handler is exactly one of the following shapes. This single contract is shared
by `match()` and the navigation interceptor, so a handler is never invoked twice:

| Shape | Meaning |
|-------|---------|
| `'page-tag'` | static element tag |
| `async () => 'page-tag'` | lazy tag factory (zero arity) |
| `{ tag: 'page-tag' }` | static tag (object form) |
| `{ load: async () => 'page-tag' }` | lazy tag factory (object form) |
| `(params, event) => { ... }` | callback (arity > 0) |
| `{ handler: (params, event) => { ... } }` | callback (object form) |

```javascript
router.register('/dashboard', 'page-dashboard');                 // tag
router.register('/reports', { load: () => loadReports() });      // lazy
router.register('/ping', (params, event) => log(params));        // callback
```

Rules:

- Prefer a tag string for routed UI.
- Use a zero-argument function or `{ load }` for lazy tag resolution.
- `match()` resolves a tag without ever running callbacks; callbacks run once, on
  navigation only.
- More specific routes are sorted before less specific routes.

### Route cache (Cache API)

The router exposes an internal cache backed by the browser Cache API for view
assets and lazily-loaded module responses. Prefetch on hover or when a link
becomes visible to make navigation instant.

```javascript
// Warm the cache for a route's assets
await router.prefetch('/pages/reports.js');

// Lower-level control
await router.cache.set('/pages/reports.js', response, 60_000); // ttl ms
const hit = await router.cache.get('/pages/reports.js');       // Response | null
await router.cache.purge('/pages/reports.js');                 // one entry
await router.cache.purge();                                     // whole cache
```

Entries use an `x-expires-at` TTL header (the same convention as the storage and
api caches) and expire automatically on read.

## 3. Pattern Matching

`router.match(url)` returns the first matching route or `null`.

```javascript
const found = await router.match('/members/42');

if (found) {
  console.log(found.tag);            // "page-member"
  console.log(found.params.member);  // "42"
}
```

Match result shape:

```javascript
{
  route,
  tag,
  params,
  result
}
```

Examples:

```javascript
router.register('/about', 'page-about');
router.register('/members/:member', 'page-member');
router.register('/assets/*', 'page-assets');
```

Specificity order:

1. Static paths: `/settings/profile`
2. Parameter paths: `/members/:member`
3. Wildcards: `/assets/*`

Within each group, longer patterns sort first.

## 4. Clearing Routes

Use `router.clear()` in tests or full app teardown.

```javascript
router.clear();
```

`clear()` only clears the route table. It does not clear guards, event listeners, containers, sync, or background connections.

Use `router.destroy()` to remove Navigation API listeners and reset guard, event, not-found, and sync listener state.

```javascript
router.destroy();
```

## 5. Navigation Events

Use `router.on(type, callback, signal?)` to subscribe to router events.

```javascript
const stop = router.on('found', ({ tag, params, url, direction }) => {
  console.log(tag, params, url, direction);
});

stop();
```

Supported events:

```javascript
'found'
'notfound'
'error'
```

Event payloads:

```javascript
router.on('found', ({ tag, params, url, direction }) => {});
router.on('notfound', ({ url }) => {});
router.on('error', ({ error, url, route, phase }) => {});
```

With abort cleanup:

```javascript
const ctrl = new AbortController();

router.on('found', refresh, ctrl.signal);

ctrl.abort();
```

Rules:

- Listener errors are caught and logged.
- `router.on` returns a disposer.
- Pass an `AbortSignal` when the listener belongs to a component lifecycle.

## 6. Programmatic Navigation

Use `router.navigate(url, options?)` for normal navigation.

```javascript
router.navigate('/members/42');
```

With state and transient info:

```javascript
router.navigate('/members/42', {
  state: { scroll: 0 },
  info: { source: 'search' }
});
```

Use `router.replace(url, options?)` when the URL change should not add a new history entry.

```javascript
router.replace('/members?page=2');
```

History traversal:

```javascript
router.back();
router.forward();
router.go(-2);
```

Read current entries:

```javascript
const entry = router.current();
const all = router.entries();

if (router.canBack()) {
  router.back();
}
```

These wrappers delegate to `window.navigation`. In non-browser environments or runtimes without Navigation API support, they return safe fallback values.

## 7. Fluent Navigation

Use `router.nav.to(url)` when you want callbacks tied to a single navigation.

```javascript
router.nav.to('/members/42')
  .on('found', ({ tag, params }) => {
    console.log(tag, params.member);
  })
  .on('notfound', ({ url }) => {
    console.warn('No route:', url);
  })
  .on('error', (err) => {
    console.error(err);
  });
```

Rules:

- `nav.to` returns a transition controller.
- `.on(event, callback)` is chainable.
- Supported fluent events are `found`, `notfound`, and `error`.
- URL matching for callbacks compares pathnames, so absolute and relative URLs can both work.

## 8. Guards

Use `router.guard(fn)` to protect navigations.

```javascript
const stop = router.guard((destination) => {
  const url = new URL(destination.url);

  if (url.pathname.startsWith('/admin') && !session.admin) {
    return '/login';
  }

  return null;
});

stop();
```

Guard shape:

```javascript
(destination, controller) => string | null | undefined | Promise<string | null | undefined>
```

Rules:

- Return a URL string to redirect.
- Return `null` or `undefined` to allow.
- Guards run in registration order.
- In browsers with `precommitHandler`, guards run before commit.
- In Safari-style fallback paths, guards also run inside the handler after commit and then replace the URL if blocked.

Grouped guard API:

```javascript
const stop = router.guards.add(fn);
router.guards.clear();
```

## 9. Not Found

Use `router.notFound(handler)` for unmatched routes.

```javascript
const stop = router.notFound(async (event) => {
  const page = document.createElement('page-not-found');
  const main = router.getContainer('main');
  main?.replaceChildren(page);
});

stop();
```

The router also emits `notfound`.

```javascript
router.on('notfound', ({ url }) => {
  console.warn(`No route matched ${url}`);
});
```

Rules:

- `notFound` sets one global unmatched-route handler.
- If no handler exists, the router logs an error.

Grouped unmatched-route API:

```javascript
router.miss.set(handler);
router.miss.clear();
```

## 10. Declarative UI Routes

Import `page` and `dock` from the definition layer and declare the route graph
explicitly.

```javascript
import { page, dock } from '@anzaui/anza/defs';

// A persistent container shell, registered in the graph under 'main'.
dock('main', { parent: 'body' });

// A route-bound page that renders through the 'main' → 'content' chain.
page('/members/:id', {
  tag: 'page-member',
  via: ['main', 'content'],
  template: { html: './member.html', css: './member.css' },
  props: { id: { type: Number } },
  on: {
    load({ params }) { return loadMember(params.id); }
  }
}, import.meta.url);
```

What happens:

1. `page()` calls `router.register(url, tag, meta)`.
2. The router matches the URL.
3. The UI orchestrator listens for `found`.
4. The orchestrator finds the named container (from the `via` chain).
5. The page element is created and params are assigned as properties.
6. If the same page tag is already mounted, params are updated on the existing instance.

### Why `via` chains matter

A page declares the ordered root-to-leaf container chain it renders through.
Missing containers are mounted automatically by the cascade rather than
throwing. Docks register parent/child relationships in a hierarchical graph,
enabling lowest-common-ancestor traversal on cross-branch navigation.

### Cascade mounting

When a navigation targets a container chain whose intermediate containers are
not yet mounted, the interceptor walks the graph path from the deepest live
ancestor down to the target, creating each missing dock in order and yielding a
frame between each so `connectedCallback` (and graph self-registration) runs.
This is what makes `via: ['main', 'sidebar', 'settings-panel']` work on a cold
hard refresh.

### Boot gate

`page()` and `dock()` register a prerequisite on the boot gate so the initial
match waits for element definitions. A hard refresh on a deep route builds its
own layout instead of erroring.

### Native files

`template: { html: './t.html', css: './s.css' }` resolves relative to the third
`import.meta.url` argument, giving full IDE support.

The native toolchain also emits `routes.json` for declarative routes during `scan`,
`build`, and `dev`.

```json
{
  "version": 1,
  "routes": [
    {
      "tag": "page-member",
      "path": "/members/:member",
      "container": "main",
      "via": ["main"],
      "params": ["member"]
    }
  ]
}
```

## 11. Containers

Use `dock` for router-owned layout slots. It registers the container in the
hierarchical graph and supports LCA traversal and cascade mounting.

```javascript
import { dock } from '@anzaui/anza/defs';

dock('app-main', { parent: 'body' });
```

Mount it in HTML:

```html
<app-main></app-main>
```

The container registers itself with the router using its `name` attribute or tag name.

```javascript
const main = router.getContainer('main');
```

Container registry APIs:

```javascript
router.registerContainer('main', element);
router.unregisterContainer('main', element);
router.getContainer('main');
router.clearContainers();
```

Rules:

- Container names are unique.
- Registering a second live container with the same name throws.
- `getContainer(name)` can also resolve CSS selectors such as `#app`.
- A route with `meta.container` fails if its required container is not active.

## 12. Container Swaps

`ui.container` injects `swapView(newElement, options?)`.

```javascript
await main.swapView(document.createElement('page-home'), {
  direction: 'push'
});
```

Swap behavior:

1. Try element-scoped `startViewTransition`.
2. Fall back to `document.startViewTransition`.
3. Fall back to `replaceChildren`.

The container sets `data-transition-direction` while swapping.

```css
:host([data-transition-direction="push"]) {
  view-transition-name: main;
}
```

## 13. Manual Containers

You can register a normal DOM node manually.

```javascript
const el = document.querySelector('#main');

router.registerContainer('main', el);

router.on('found', ({ tag, params }) => {
  const page = document.createElement(tag);
  Object.assign(page, params);
  el.replaceChildren(page);
});
```

Clean up when the container is removed.

```javascript
router.unregisterContainer('main', el);
```

## 14. Route-Scoped Connections

Use `router.links.add(pattern, factory)` to manage background connections tied to active routes.

```javascript
const stop = router.links.add('/rooms/:room', async ({ url, params }) => {
  console.log(params.room);

  const socket = new WebSocket(`wss://example.com${url.pathname}`);

  return {
    close() {
      socket.close();
    }
  };
});

stop();
```

The older direct API remains available:

```javascript
const stop = router.registerConnection('/rooms/:room', factory);
```

The router coordinates connections after `navigatesuccess`.

```javascript
router.getActiveConnections();
router.links.remove('/rooms/:room');
router.links.clear();
router.clearConnections();
```

### Links API

The `router.links` object provides normalized verbs for managing route-scoped connections:

| Method | Purpose |
|---|---|
| `router.links.add(pattern, factory)` | Register a connection factory (returns disposer) |
| `router.links.remove(pattern)` | Remove a specific connection factory and close its active connection |
| `router.links.clear()` | Remove all connection factories and close all active connections |

Connection behavior:

- A matching route opens the connection if it is not active.
- Navigating away closes stale connections.
- The factory receives `{ url, params }`.
- A connection object can expose `close()` or `disconnect()`.
- Factory errors are caught and logged.

For tests or manual coordination:

```javascript
import { coordinateConnections } from '@anzaui/anza/router';

await coordinateConnections('/rooms/general');
```

## 15. Cross-Tab Sync

The router bootstraps tab sync on client load when `BroadcastChannel` and `window.navigation` exist.

Behavior:

- On `navigatesuccess`, the current URL is broadcast on `native-router-sync`.
- Other same-origin tabs receive the message.
- The receiving tab calls `router.navigate(url, { state })`.
- A loop guard prevents repeated same-URL sync events.

Public controls:

```javascript
router.sync.stop();
router.sync.start();
router.sync.active();
router.sync.close();
```

Rules:

- `stop()` pauses handlers without closing the channel.
- `start()` resumes sync.
- `active()` reports whether sync is running.
- `close()` stops sync, closes the channel, and resets internal state.

## 16. View Transitions

The router wraps route event work in `transitions.run`.

```javascript
import { transitions } from '@anzaui/anza/router';

await transitions.run(() => {
  container.replaceChildren(page);
});
```

Shared element source:

```javascript
await transitions.run(() => {
  container.replaceChildren(detail);
}, {
  sourceElement: card,
  name: 'selected-card'
});
```

Rules:

- If View Transitions are unsupported, the callback runs directly.
- If `prefers-reduced-motion: reduce` matches, the callback runs directly.
- `sourceElement.style.viewTransitionName` is set temporarily.
- The name is cleared after transition completion.
- Aborted transition errors are caught and logged.

## 17. Router-Aware Links

The elements package registers `<nav-link>`.

```html
<nav-link href="/members">Members</nav-link>
```

Behavior:

- Same-origin clicks call router navigation.
- Modified clicks, `_blank`, hash-only links, and external links use normal browser behavior.
- Matching active routes set `aria-current="page"` on the internal anchor.
- External links dispatch a cancelable `external` event.

External gate:

```javascript
document.addEventListener('external', (event) => {
  if (!confirm(`Open ${event.detail.href}?`)) {
    event.preventDefault();
  }
});
```

## 18. Testing Router Code

Clear route state between tests.

```javascript
beforeEach(() => {
  router.clear();
  router.guards.clear();
  router.miss.clear();
  router.clearContainers();
  router.clearConnections();
  router.sync.stop();
});
```

Test matching directly:

```javascript
router.register('/members/:member', 'page-member');

const found = await router.match('/members/42');

if (found.params.member !== '42') {
  throw new Error('wrong param');
}
```

Test route events with disposers:

```javascript
const stop = router.on('found', (detail) => {
  console.log(detail.tag);
});

stop();
```

## 19. Runtime Requirements

The router is built around modern browser APIs:

- `window.navigation`
- `URLPattern`
- `BroadcastChannel`
- `WeakRef`
- `FinalizationRegistry`
- `MutationObserver`
- `document.startViewTransition`

Polyfills exist in `core/platform` for Navigation API and URLPattern. Other APIs degrade where possible.

## 20. Security

- Treat route params as untrusted strings.
- Validate params before using them in network requests.
- Use guards for client-side UX protection, not as the only security boundary.
- Protect sensitive routes on the server or service worker layer too.
- Avoid direct `location.href`, `history.pushState`, and `history.replaceState`.
- Use `router.navigate` and `router.replace`.
- Keep guard callbacks fast and deterministic.

## 21. Performance

- Register routes once at startup.
- Prefer tag strings or zero-argument lazy tag factories.
- Keep route guards fast.
- Use route-scoped connections for sockets and streams.
- Use containers to avoid remounting stable layouts.
- Use `replace` for filter/search URL updates that should not create history entries.
- Debounce search-as-you-type URL updates.

## 22. Checklist

- Use `router.register` for manual routes.
- Use `router.load` to bulk-register routes from JSON configuration.
- Use `page()` for declarative route-bound elements.
- Use `dock()` for named layout containers.
- Use `router.on('found')`, `router.on('notfound')`, and `router.on('error')` for events.
- Use `router.guard` for client-side route gates.
- Use `router.guards.clear()` in tests or teardown.
- Use `router.notFound` for unmatched routes.
- Use `router.miss.clear()` to reset the unmatched-route handler.
- Use `router.navigate` and `router.replace` for URL writes.
- Use `router.nav.to` for chainable navigation callbacks.
- Use `router.links` (add/remove/clear) for route-scoped background connections.
- Use `router.registerConnection` for the direct connection factory API.
- Use `router.sync.stop()` when tab mirroring should pause.
- Clear routes, containers, and connections in tests.
- Keep URL state in the URL.
- Treat route params as untrusted input.
