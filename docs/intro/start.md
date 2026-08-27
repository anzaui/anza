# Start

Create a new Anza app and run it.

---

## Scaffold

```bash
npm create @anzaui/anza myapp
cd myapp
npm install
```

This generates:

| Path | Purpose |
| ------ | ------- |
| `src/app.js` | Entry point — imports UI, barrels, and defines a layout dock |
| `src/index.html` | HTML shell with importmap, tokens, styles, and module script |
| `src/sw.js` | Service Worker entry — caching, routing, sync |
| `src/pages/index.js` | Pages barrel |
| `src/pages/entry/index.js` | Landing page definition |
| `src/pages/entry/index.html` | Landing page markup |
| `src/pages/entry/index.css` | Landing page styles |
| `src/docks/index.js` | Docks barrel (empty until you add docks) |
| `src/views/index.js` | Views barrel — global views slot |
| `src/parts/index.js` | Parts barrel |
| `src/tokens/` | Design tokens copied from the library (colors, spacing, typography) |
| `src/styles/` | Global styles copied from the library (reset, layers, base) |
| `importmap.json` | Empty starter for custom aliases |
| `package.json` | Scripts: `dev` and `build` |

You own `src/tokens/` and `src/styles/`. The library copies them in as starter files; change them freely.

Empty `src/docks/`, `src/views/`, and `src/parts/` folders (with `index.js` barrels) are teaching affordances — optional at runtime. You may rename the landing folder, add extra page trees (e.g. `src/docs/`), or skip `src/sw.js` for static sites. Full required / recommended / optional tables, index-per-folder convention, and optional `anza.json` remaps: [structure.md](structure.md).

Apps need **no** `anza.json` at create time. Add one only when remapping roots, declaring extra page trees (`pages[]`), or listing additional service workers.

---

## Run

```bash
npm run dev
```

Opens a dev server on `http://localhost:3000` with:

- Import graph resolution into `dist/`
- Separate `dist/importmap.json` linked from HTML
- Mode A SSG for public routes (hard refresh) + CSR fragments for soft-nav
- CSS hot-swapping via SSE
- JS and HTML auto-reload on change

Validate the layout before shipping:

```bash
npx anza doctor   # soft: warnings print, exit 0
npx anza check    # CI: warnings fail
```

---

## Generate more files

Thin helpers into convention slots (updates the slot `index.js` barrel):

```bash
npx anza generate page about
npx anza generate dock sidebar --parent main
npx anza generate view card
npx anza generate part button
```

Flags: `--tree`, `--route`, `--via`, `--parent`, `-s/--src`. Docks are created **without** error-page HTML — fallbacks stay by reference ([fallbacks.md](../router/fallbacks.md)). Details: [build.md](build.md#generate) and [structure.md](structure.md#generate-anza-generate).

---

## What Was Generated

### `src/app.js`

```javascript
import '@anzaui/anza/ui';
import { dock } from '@anzaui/anza/ui';
import '@anzaui/anza/theme';

import './docks/index.js';
import './views/index.js';
import './parts/index.js';
import './pages/index.js';

navigator.serviceWorker.register('/sw.js', { type: 'module' });

dock('main');
```

This initializes the UI system, loads barrels, registers the Service Worker, and creates a `main` dock. Source import order is free-form — `anza build` rewrites `dist/` into usage order (library → docks → views → parts → pages).

### `src/pages/entry/index.js`

```javascript
import { page } from '@anzaui/anza/ui';

page('/', {
  tag: 'page-welcome',
  via: ['main'],
  template: { html: './index.html', css: './index.css' }
}, import.meta.url);
```

Defines a route at `/` that renders through the `main` dock, loading its markup and styles from sibling files.

### Customizing the landing page

The `src/pages/entry/` folder is the scaffold default. You can rename it, delete it, or replace it with any folder or files you want. The only requirement is that `src/pages/index.js` imports whatever defines your `/` route.

```javascript
// src/pages/index.js
import './entry/index.js';     // default — can rename
import './home/index.js';      // or call it home
import './landing/index.js';   // or landing
```

You can also define the route inline without a separate folder:

```javascript
// src/pages/index.js
import { page } from '@anzaui/anza/ui';

page('/', {
  tag: 'page-home',
  via: ['main'],
  template: '<h1>Home</h1>'
});
```

---

## Next

Add a new page (hand-write or `anza generate page about`):

```javascript
import { page } from '@anzaui/anza/ui';

page('/about', {
  tag: 'page-about',
  via: ['main'],
  template: '<h1>About</h1>'
});
```

Import it from `src/pages/index.js` if you did not use `generate` (generate updates the barrel for you).

Clicking `<a href="/about">` is intercepted, matched, and soft-nav swaps only the page leaf inside `main` — the dock stays mounted. Both `anza dev` and `anza build` emit contentful SSG HTML per public route for hard refresh; soft-nav loads page fragments (see [ssg/contract.md](../ssg/contract.md)).

### Suggested reading order

1. [structure.md](structure.md) — what must exist; `anza.json`; doctor/check
2. [build.md](build.md) — flags, SSG, generate
3. [router/pages.md](../router/pages.md) / [router/docks.md](../router/docks.md) — `page` / `dock`
4. [router/fallbacks.md](../router/fallbacks.md) — 404 / error / offline without folder copies
