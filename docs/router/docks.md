# Docks

`dock(name, config, base)` defines a persistent container shell. Docks live across route changes, register themselves in the hierarchical container graph on connect, and expose a `swap` method for animated content replacement.

---

## Signature

```javascript
dock(name, config, base);
```

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | yes | Unique key in the container graph, e.g. `'main'` |
| `config` | object | no | Dock definition |
| `base` | string | no | `import.meta.url` of the caller |

---

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

Inline CSS. Automatically prepended with `contain: layout` styling for view transition isolation.

```javascript
dock('main', {
  style: ':host { background: #f5f5f5; }'
});
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

### `notfound`

Custom HTML or template config to render inside the dock when a 404 (route not found) is encountered. The deepest configured dock in the container chain wins at runtime:

```javascript
dock('main', {
  notfound: '<div class="error-404"><h1>Oops! Page Not Found</h1></div>'
});
```

---

## Default Containment

Every dock automatically receives:

```css
:host { contain: layout; display: block; }
```

The `contain: layout` declaration is required for element-scoped view transitions. It is prepended to any user-supplied style.

---

## Swap Method

Docks expose a `swap` method that replaces child content under a view transition:

```javascript
await dockElement.swap(newElement, { direction: 'push' });
```

The swap strategy:

1. Abort any in-flight transition on this dock (prevents half-finished animations on rapid navigation)
2. Try element-scoped `startViewTransition` (Chrome 147+, concurrent-safe)
3. Fall back to `document.startViewTransition`
4. Fall back to synchronous `replaceChildren`

The `direction` option (`'push'`, `'replace'`, `'back'`, `'forward'`) is exposed as a dataset attribute for CSS directional transitions:

```css
:host([data-transition-direction="back"]) { ... }
```

---

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

---

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

---

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

---

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
