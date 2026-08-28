# Docks

`dock(name, config, base)` defines a persistent container shell. Docks live across route changes, register themselves in the hierarchical container graph on connect, and expose a `swap` method for animated content replacement.

## Signature

```javascript
dock(name, config, base);
```

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | yes | Unique key in the container graph, e.g. `'main'` |
| `config` | object | no | Dock definition |
| `base` | string | no | `import.meta.url` of the caller |

## Config Fields

### `tag`

Custom element tag. Defaults to `dock-<name>`.

```javascript
dock('main', { tag: 'app-shell' });
// Defines <app-shell>
```

### `parent`

Parent container key in the graph. Defaults to `'body'`.

```javascript
dock('sidebar', { parent: 'main' });
// sidebar is a child of main in the graph
```

### `template`

Same as `page()`: inline string or file reference.

```javascript
dock('main', {
  template: { html: './main.html', css: './main.css' }
}, import.meta.url);
```

If no template is provided, the default is `'<slot></slot>'` — a passthrough shell.

### `style`

Inline CSS string, a file path, or an array containing CSS strings or stylesheet paths (both relative and root-relative starting with `/`). Automatically prepended with `contain: layout` styling for view transition isolation.

```javascript
// Inline CSS
style: ':host { background: #f5f5f5; }'

// Single stylesheet path
style: './main.css'

// Multiple stylesheets from any folder
style: ['/styles/shared.css', './main.css']
```

### `params` and `query`

Typed parameter and query contract arrays. If the active route provides dynamic segments or mapped query parameters, the library automatically casts and sets these properties on the dock element reactively, triggering update cycles:

```javascript
dock('detail', {
  params: [
    { name: 'id', type: Number }
  ],
  query: [
    { name: 'tab', type: String }
  ]
});
```

### `notfound` / `error` / `offline`

**Optional overrides.** Bare `dock('name')` already gets miss / error / offline UI from the **shared library built-ins** (`pages.js`) — do **not** copy `404.html` into every dock folder. Scaffold correctly creates docks without error-page files. The `src/docks/` folder itself is an **optional** structure slot — `dock()` may live in `app.js` ([structure.md](../intro/structure.md)).

Soft-nav swaps the **leaf** dock only; parent chrome stays. Walk leaf → root: the deepest dock that defines the kind supplies the template (may paint into a deeper leaf host). Override only for branded UI:

```javascript
dock('content', {
  parent: 'docs',
  notfound: { tag: 'page-docs-not-found' },
  error: { tag: 'page-docs-error' },
  offline: { tag: 'page-offline' }
});
```

HTML strings and `{ html }` still work. Full ladder + bare-dock sample: [fallbacks.md](fallbacks.md).

`anza generate dock <name>` creates a leaf under `src/docks/` **without** `404.html` — that is intentional.

## Default Containment

Every dock automatically receives:

```css
:host { contain: layout; display: block; }
```

The `contain: layout` declaration is required for element-scoped view transitions. It is prepended to any user-supplied style.

## Soft-nav persistence

On soft navigation within the same `via` chain, parent docks stay mounted. Only the leaf page inside the innermost dock is swapped. That is what keeps docs chrome (sidebar, header) alive while page content changes.

For Mode A SSG / Mode B HTML, nested docks and the page leaf must be **light-DOM children** after each host’s `<template shadowrootmode="open">` — never baked inside the parent shadow template. Registry key `content` often maps to tag `dock-doccontent` (not `dock-content`). See [ssg/contract.md](../ssg/contract.md) and [ui/hydration.md](../ui/hydration.md).

## Swap Method

Docks expose a `swap` method that replaces child content under a view transition:

```javascript
await dockElement.swap(newElement, { direction: 'push' });
```

The swap strategy (element-scoped only — **never** document VT for docks):

1. Abort / skip any in-flight transition on this dock (rapid nav must not leave a half-finished animation)
2. Try `host.startViewTransition` when `supports.elementViewTransitions` (Chrome 147+)
3. Otherwise **direct** `replaceChildren` (no `document.startViewTransition` — that would snapshot sidebar/header)

Opt out with `dock(..., { transition: false })`, `swap(..., { transition: false })`, `configureTransitions({ enabled: false })`, or reduced-motion. Pass `{ signal }` so soft-nav abort calls `skipTransition` and clears names.

The `direction` option (`'push'`, `'pop'`, `'replace'`; `'back'` is treated like `'pop'` for easing) is exposed as `data-transition-direction` for CSS:

```css
:host([data-transition-direction="pop"]) { ... }
```

See [router/transitions.md](transitions.md) and [ui/transitions.md](../ui/transitions.md).

## Lifecycle Hooks

Docks support the same `on` hooks as pages:

```javascript
dock('main', {
  on: {
    connect({ el }) {
      console.log('main dock connected');
    },
    disconnect({ el }) {
      console.log('main dock disconnected');
    }
  }
});
```

User-supplied `connect` and `disconnect` hooks are wrapped so the dock still registers and unregisters itself in the graph.

## Graph Registration

When a dock connects:

```javascript
router.registerContainer(name, element, parent);
```

When it disconnects:

```javascript
router.unregisterContainer(name, element);
```

This happens automatically. You do not need to call these manually for docks.

## Example: Sidebar Layout

```javascript
dock('main');
dock('sidebar', { parent: 'main' });
dock('content', { parent: 'main' });

page('/dashboard', {
  tag: 'page-dashboard',
  via: ['main', 'content']
});

page('/settings', {
  tag: 'page-settings',
  via: ['main', 'sidebar']
});
```

Dashboard renders through `main → content`. Settings renders through `main → sidebar`. The router computes the LCA (`main`) and only swaps the divergent branch.

## Example: Custom Swap Animation

```javascript
dock('main', {
  on: {
    connect({ el }) {
      // The swap method is already installed by dock().
      // You can override it for custom behavior.
      el.swap = async (newEl, options) => {
        el.style.opacity = '0';
        await new Promise(r => setTimeout(r, 150));
        el.replaceChildren(newEl);
        el.style.opacity = '1';
      };
    }
  }
});
```
