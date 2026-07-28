# Intro

Anza is a web platform library built on browser-native APIs. It gives you reactive state, client-side routing, custom elements, offline sync, and animations — all as plain ES modules the browser resolves directly. No bundler, no virtual DOM, no framework lock-in.

A Rust CLI (`anza`) handles the development server, import-graph resolution, and build. It copies only the modules you actually import into `dist/`, generates type declarations, and serves everything with hot module replacement.

---

## What You Get

- **Pure ESM modules** — authored as `.js` files, resolved by the browser natively
- **Reactive state** — typed stores with batched updates and cross-tab sync
- **Declarative components** — `page()`, `dock()`, `view()`, `part()` instead of classes
- **File templates** — split markup, styles, and logic into `.html`, `.css`, and `.js`
- **Client-side router** — AOT matching tree compiled by Rust, design-by-contract typed validations, URLPattern-based matching with hierarchical container layouts
- **Offline queue** — IndexedDB-backed operation queue with retry and conflict resolution
- **Service Worker toolkit** — caching strategies, route interception, background sync, and push notifications
- **Automatic theme switching** — light, dark, and high-contrast with OS preference detection and localStorage persistence
- **Animation helpers** — WAAPI wrappers, stagger groups, and view transitions
- **Real-browser tests** — `@web/test-runner` with Playwright, no jsdom

---

## Package

```javascript
import { state } from '@adukiorg/anza/state';
import { router } from '@adukiorg/anza/router';
import { page, dock, view } from '@adukiorg/anza/ui';
```

---

## File Map

| File | What It Covers |
| ------ | -------------- |
| [install.md](install.md) | Install the library and build the CLI |
| [start.md](start.md) | Scaffold your first app |
| [build.md](build.md) | Dev server, production build, and diagnostics |
| [structure.md](structure.md) | Project folder conventions |
| `docs/sw/` | Service Worker caching, routing, sync, and push |

---

## One-File Example

```html
<!-- src/index.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Hello</title>
    <link rel="stylesheet" href="/tokens/index.css">
    <script type="module" src="/app.js"></script>
  </head>
  <body></body>
</html>
```

```javascript
// src/app.js
import '@adukiorg/anza/ui';
import { dock, page } from '@adukiorg/anza/ui';

dock('main');

page('/', {
  tag: 'page-home',
  via: ['main'],
  template: '<h1>Hello, Anza</h1>'
});
```

That is a complete app. Run `anza dev` and open `http://localhost:3000`.

---

## Next Steps

- New here? Read [install.md](install.md) then [start.md](start.md).
- Want the router? See `docs/router/`.
- Want the UI layer? See `docs/ui/`.
- Need offline and caching? See `docs/sw/`.
- Need the API surface? Check the per-module docs in `docs/`.
