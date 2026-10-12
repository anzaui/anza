---
title: "Getting Started"
order: 1
---

# Intro

Anza is a web platform library built on browser-native APIs. It gives you reactive state, client-side routing, custom elements, offline sync, and animations as plain ES modules. Source is plain JavaScript, HTML and CSS, with no virtual DOM and no JSX or TypeScript compile step.

A Rust CLI (`anza`) runs the dev server and the build. `anza dev` serves your modules unbundled, as the browser loads them, and reloads on change. `anza build` copies only the modules you import, pre-renders public routes to HTML, and bundles the modules into hashed chunks with [Rolldown](https://rolldown.rs) when it is installed (`--no-bundle` turns that off). It also writes type declarations for your editor.

## What You Get

- **Plain ESM modules** — authored as `.js` files; unbundled in dev, bundled for production
- **Reactive state** — typed stores with batched updates and cross-tab sync
- **Declarative components** — `page()`, `dock()`, `view()`, `part()` instead of classes
- **File templates** — split markup, styles, and logic into `.html`, `.css`, and `.js`
- **Client-side router** — route manifest built by the CLI, typed route params, nested dock layouts
- **Static HTML for public routes** — pre-rendered pages with titles, descriptions, Open Graph tags, JSON-LD and a sitemap
- **Offline queue** — IndexedDB-backed operation queue with retry and conflict resolution
- **Service Worker toolkit** — caching strategies, route interception, background sync, and push notifications
- **Automatic theme switching** — light, dark, and high-contrast with OS preference detection and localStorage persistence
- **Animation helpers** — WAAPI wrappers, stagger groups, and view transitions

## Package

```javascript
import { state } from '@anzaui/anza/state';
import { router } from '@anzaui/anza/router';
import { page, dock, view } from '@anzaui/anza/ui';
```

## File Map

| File | What It Covers |
| ------ | -------------- |
| [Install](install.md) | Install the library and prebuilt CLI |
| [Start](start.md) | Scaffold your first app |
| [Build](build.md) | Dev server, production build, `doctor` / `check` / `generate` |
| [Structure](structure.md) | **Project structure contract** — required slots, `anza.json`, doctor/check, `anza generate` |
| [Service Worker](../sw/index.md) | Service Worker caching, routing, sync, and push |

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
  <body>
    <dock-main></dock-main>
  </body>
</html>
```

```javascript
// src/app.js
import '@anzaui/anza/ui';
import { dock, page } from '@anzaui/anza/ui';

dock('main');

page('/', {
  tag: 'page-home',
  via: ['main'],
  template: '<h1>Hello, Anza</h1>'
});
```

That is a complete app. Run `anza dev` and open `http://localhost:3000`.

## Next Steps

- New here? Read [Install](install.md) then [Start](start.md).
- What must exist on disk? See [Structure](structure.md) — single source of truth (`anza doctor` / `anza check`).
- Want the router? See [Router](../router/index.md).
- Want the UI layer? See [UI](../ui/index.md).
- Shipping public pages? See [Page HTML contract (Mode A SSG · Mode B templates)](../ssg/contract.md) (site-root URLs, open DSD) and [Hydration (DSD adopt)](../ui/hydration.md).
- Need offline and caching? See [Service Worker](../sw/index.md).
