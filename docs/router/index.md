# Router

The Anza router is a client-side routing engine built on the Navigation API and URLPattern. It intercepts every navigation — link clicks, form submissions, history traversals, and programmatic calls — at a single junction, matches URLs against registered routes, and renders the corresponding view into the right container.

It is designed for hierarchical layouts: pages declare the container chain they render through, and the router ensures every intermediate container exists before mounting. A hard refresh on `/settings/profile` will build the full `body → main → sidebar → settings-panel` chain automatically rather than erroring because a container is missing.

## What You Get

- **URLPattern matching** with static routes, parameters (`:id`), wildcards (`*`), and parent chains
- **Hierarchical containers** via `dock()` — persistent layout shells that register in a parent-child graph
- **Cascade mounting** — missing containers are created automatically on deep-link hard refreshes
- **View transitions** — GPU-accelerated page swaps, falling back gracefully when unsupported
- **Navigation guards** — block, redirect, or gate routes at pre-commit or post-commit time
- **Cross-tab sync** — keep duplicate tabs in navigation sync via BroadcastChannel
- **Route cache** — prefetch and cache view assets with TTL
- **Deferred boot gate** — the initial route match waits for custom element definitions so deep links work on cold load

## Package

```javascript
import { router } from '@anzaui/anza/router';
import { page, dock, view, part } from '@anzaui/anza/defs';
```

The router also exposes itself as `window.router` (non-enumerable, non-configurable) for devtools and non-module contexts.

## File Map

| File | What It Covers |
|------|----------------|
| [quickstart.md](quickstart.md) | Your first route in five minutes |
| [routes.md](routes.md) | Defining routes: patterns, params, specificity, parent chains |
| [handlers.md](handlers.md) | The six shapes a route handler can take |
| [guards.md](guards.md) | Blocking and redirecting navigation |
| [navigation.md](navigation.md) | Programmatic navigation and history |
| [containers.md](containers.md) | The container graph, via chains, cascade mounting, LCA |
| [pages.md](pages.md) | `page()` — route-bound element definitions |
| [docks.md](docks.md) | `dock()` — container shells with swap transitions |
| [components.md](components.md) | `view()` and `part()` — stateful and stateless components |
| [events.md](events.md) | `found`, `notfound`, `error`, and `on()` subscriptions |
| [transitions.md](transitions.md) | CSS View Transitions wrapper |
| [cache.md](cache.md) | Prefetch and route caching |
| [sync.md](sync.md) | Cross-tab navigation synchronization |
| [advanced.md](advanced.md) | Boot gate, trie matcher, handler contract, internals |
| [api.md](api.md) | Complete API reference |
| [troubleshooting.md](troubleshooting.md) | Common problems and how to fix them |

## The Three-Layer Model

The router is organized into three layers. You will spend most of your time in the top two.

**1. Definition layer** — `page()`, `dock()`, `view()`, `part()`

Declarative functions that define custom elements and register routes. A `page` is a `view` that also owns a URL. A `dock` is a container shell that lives across route changes.

**2. Router facade** — `router.register`, `router.navigate`, `router.guard`, `router.on`

Imperative APIs for programmatic control, event subscription, and advanced use cases.

**3. Internal machinery** — `match.js`, `intercept.js`, `graph.js`, `cascade.js`

What makes the router fast and correct. You do not call these directly unless you are extending the router.

## One-File Example

```html
<!-- index.html -->
<script type="module" src="./app.js"></script>
<body></body>
```

```javascript
// app.js
import { page, dock } from '@anzaui/anza/defs';

// A persistent container shell
dock('main');

// A route that renders through 'main'
page('/', {
  tag: 'page-home',
  via: ['main'],
  template: { html: './home.html', css: './home.css' },
  on: {
    load() { console.log('home mounted'); }
  }
}, import.meta.url);
```

That is a complete working route. The router auto-bootstraps, intercepts link clicks, matches the URL, and renders `page-home` inside the `main` dock.

## Next Steps

- New to the router? Start with [quickstart.md](quickstart.md).
- Want the full route API? Read [routes.md](routes.md) and [handlers.md](handlers.md).
- Building layouts with sidebars and panels? See [containers.md](containers.md) and [docks.md](docks.md).
- Need to block certain routes? [guards.md](guards.md).
- Want animated page swaps? [transitions.md](transitions.md).
- Prefer a single reference page? [api.md](api.md).
