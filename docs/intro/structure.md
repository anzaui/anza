# Structure

Normative **folder contract** for Anza apps: one spine humans learn once, optional slots, and an optional `anza.json` for remaps. Validate with `anza doctor` (soft) or `anza check` (strict CI). Sibling metaphor: [ssg/contract.md](../ssg/contract.md) is the HTML contract; this page is the **project layout** contract.

Planning detail: [plans/STRUCTURE.md](../../plans/STRUCTURE.md). JSON Schema: [`@anzaui/anza/schemas/anza.schema.json`](../../library/schemas/anza.schema.json).

Tone: **one spine, many leaves** — same story as hierarchical docks.

**This page is the single source of truth** for “what must exist on disk?” — start at [What must exist](#what-must-exist), then optional slots and [Troubleshooting](#troubleshooting).

---

## What must exist

| Must | Path | Notes |
| ---- | ---- | ----- |
| Package | `package.json` | `"type": "module"`; scripts may call `anza` |
| Shell | `src/index.html` | Import map + tokens/styles links + module entry |
| Entry | `src/app.js` | Registers root dock + imports barrels (or configured `entry`) |
| ≥1 page | reachable `page(...)` | Anywhere in the import graph |
| Root dock | `dock('main')` (default) | May live in `app.js`; `src/docks/` optional |

Semantic required (not only path existence):

1. Entry reachable from the shell’s `<script type="module">`.
2. At least one `page(...)` in the reachable graph.
3. Root dock (default name `main`) registered via `dock(...)` before pages that `via` it — `anza check` **warns** if missing; **errors** if a `via` name has no `dock()`.
4. Shell uses **site-root** asset URLs (`/app.js`, `/tokens/...`, `/styles/...`) — see [ssg/contract.md](../ssg/contract.md).

Apps need **no** `anza.json`. `anza create` / `npm create @anzaui/anza` writes the default tree. Add `anza.json` only when remapping roots, declaring extra page trees, or listing additional service workers.

### Recommended (scaffold creates; tooling may warn if missing)

| Slot | Path | Notes |
| ---- | ---- | ----- |
| Pages barrel | `src/pages/index.js` | Imports page folders; not the only allowed page tree |
| Landing page | `src/pages/<name>/` | Scaffold uses `entry/` with `index.js` (+ optional `.html` / `.css`) |
| Tokens | `src/tokens/` | Copied at create; owned by the app |
| Styles | `src/styles/` | Copied at create; owned by the app |
| Service Worker | `src/sw.js` | Recommended for offline; not hard-required |
| Import map stub | `importmap.json` | Empty `{}` ok; merged at build |

### Optional

| Slot | Default path | Rules |
| ---- | ------------ | ----- |
| Docks | `src/docks/` | May be empty or absent; `dock()` can live in `app.js`; barrel `index.js` when present |
| Views | `src/views/` | **Global** reusable stateful components (optional slot + remap) — not a per-dock CE registry |
| Parts | `src/parts/` | Stateless primitives; barrel `index.js` when present |
| Extra page trees | e.g. `src/docs/` | Allowed when imported from entry/barrels; declare in `anza.json` `pages[]` for tooling hints |
| SW modules | `src/sw/` | Shared helpers imported by `sw.js` — **not** auto-registered workers |
| Legacy elements | `src/elements/` | Warn if coexist with `pages` — migrate to view/part/page |
| SSG config | `ssg.json` / `ssg.params.json` | Existing contracts |
| Fallbacks | *by reference* | `dock` / `page` `{ notfound \| error \| offline }` or library built-ins — **not** folder slots ([fallbacks.md](../router/fallbacks.md)) |

### Explicitly not required

- `src/core/` (library concern)
- Per-route folders named exactly like URLs
- `src/index.js` (legacy discovery fallback only; scaffold uses `app.js`)
- Empty placeholder dirs (scaffold may still create empty `docks` / `views` / `parts` for discoverability)

---

## Index-per-folder convention

Each **meaningful** folder under views, docks, pages, and user trees should expose an **`index`** barrel (`index.js`, plus `index.html` / `index.css` when the leaf owns markup/styles). Scaffold and `anza check` / doctor expect this.

| Tree | Barrel | Leaf |
| ---- | ------ | ---- |
| Pages | `src/pages/index.js` | `src/pages/<name>/index.js` |
| Docks | `src/docks/index.js` | `src/docks/<name>/index.js` (or a single file imported from the barrel) |
| Views | `src/views/index.js` | `src/views/<name>/index.js` |
| Parts | `src/parts/index.js` | `src/parts/<name>/index.js` |
| Extra page trees | e.g. `src/docs/index.js` | `src/docs/.../index.js` |

Co-locating a view under a dock or user folder is **organization only** — custom element tags remain **global**. There is no dock-scoped CE registry.

---

## Import order (tooling, not developer)

Source may import modules in **any** order. **`anza build` / extract** rewrites static `import` / `export … from` declarations in emitted `dist/` JS into **usage order**:

1. Library / bare specifiers  
2. Docks  
3. Views  
4. Parts  
5. Pages (including extra trees such as `docs/`)  
6. Other relative modules  

Mid-file static imports are hoisted into that ordered block. Semantics stay multi-file ESM (no bundling). Rely on the build — do not treat source import order as load order. Remapped slot names from `anza.json` (`docks`, `views`, `parts`, `pages`) feed the classifier.

---

## Validate (`anza doctor` / `anza check`)

```bash
anza doctor          # soft: errors fail; warnings print, exit 0
anza doctor --strict # same severity as check
anza check           # CI: errors or warnings → non-zero
```

Findings point back here (`docs/intro/structure.md`). Checks the required spine, recommended tokens/styles/SW/importmap, optional slots + index barrels, `anza.json` `sw` string|array, legacy `elements/`+pages coexistence, undeclared page trees, and **via → dock** consistency. Docks may live in `app.js` — `src/docks/` is optional. See [build.md](build.md#diagnostics).

### CI snippet

```bash
anza check && anza build
```

Or in `package.json`:

```json
{
  "scripts": {
    "check": "anza check",
    "build": "anza build",
    "ci": "anza check && anza build"
  }
}
```

---

## Generate (`anza generate`)

Thin filesystem helpers into declared slots (respects `anza.json` remaps). Updates the slot barrel (`index.js`). Not a Nest schematic platform.

```bash
anza generate page about
anza generate page home --tree docs --route /docs/home --via main,docs
anza generate dock sidebar --parent main
anza generate view card
anza generate part button
```

| Kind | Default path | Notes |
| ---- | ------------ | ----- |
| `page` | `src/pages/<name>/` | Also `--tree` for extra page trees listed in `pages[]` |
| `dock` | `src/docks/<name>/` | No error HTML files — fallbacks stay by reference |
| `view` | `src/views/<name>/` | Global views slot |
| `part` | `src/parts/<name>/` | Stateless primitives |

Each leaf gets `index.js` (+ `index.html` / `index.css`). Import the barrel from `app.js` if it is not already wired.

---

## Views model

**Recommended:** one optional global `src/views/` slot (remappable via `anza.json` `views`). Rejected: a dock-scoped custom-element registry. Put shared views in `src/views/`; nest under docks only when it helps humans browse files — tags and registration stay app-global.

---

## Root files

| File | Why it exists |
| ---- | ------------- |
| `package.json` | Lists `@anzaui/anza`; exposes `npm run dev` / `npm run build` |
| `importmap.json` | Empty starter for user aliases; CLI merges library mappings at build |
| `anza.json` | **Optional** structure remaps + extra page trees / SW list (scaffold omits it) |
| `ssg.json` | Optional SSG / SEO settings (sibling until optional merge into `anza.json`) |
| `.gitignore` | Excludes `node_modules/`, `dist/`, `.anzacache.json` |

---

## What the scaffold generates

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

Bootstraps the UI, loads barrels, registers the Service Worker, and creates a `main` dock. All pages render through this dock by default unless they set another `via`. Import order in source is free-form; build rewrites `dist/` into usage order.

### `src/index.html`

```html
<script type="importmap" src="/importmap.json"></script>
<link rel="stylesheet" href="/tokens/index.css">
<link rel="stylesheet" href="/styles/index.css">
<script type="module" src="/app.js"></script>
```

The shell loads the import map, design tokens, global styles, and the app entry. The CLI injects the HMR script in dev mode.

### `src/sw.js`

```javascript
import { precache, router, CacheFirst, NetworkFirst, pruneStale, claim } from '@anzaui/anza/sw';

const SHELL = 'shell-v2';
const API = 'api-v2';

self.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      await precache(SHELL, ['/index.html', '/app.js', '/tokens/index.css', '/styles/index.css']);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(Promise.all([pruneStale(SHELL), claim()]));
});

const r = router();
r.register('*', new CacheFirst(SHELL));
r.register('/api/*', new NetworkFirst(API, { timeout: 3000 }));

self.addEventListener('fetch', (e) => {
  if (r.handle(e)) return;
  e.respondWith(fetch(e.request));
});
```

Pre-caches the app shell. Static assets use `CacheFirst`; API calls use `NetworkFirst` with a 3-second timeout. Bump `SHELL` / `API` when shipping path-breaking asset URL changes. See [sw/start.md](../sw/start.md).

### `src/pages/entry/index.js`

```javascript
import { page } from '@anzaui/anza/ui';

page('/', {
  tag: 'page-welcome',
  via: ['main'],
  template: { html: './index.html', css: './index.css' }
}, import.meta.url);
```

Defines `/`. `via: ['main']` mounts inside the `main` dock. `import.meta.url` resolves relative template paths from this file.

### `src/pages/index.js`

Barrel — `app.js` needs one import:

```javascript
import './entry/index.js';
```

Add a folder, import it here, and the route registers. The `entry/` name is a convention — rename or replace it; whatever defines `/` in this barrel is the landing page. Scaffold also writes empty `src/docks/index.js`, `src/views/index.js`, and `src/parts/index.js` barrels.

---

## Extra page trees

Pages are **not** required to live only under `src/pages/`. The docs site uses `src/pages/` **and** `src/docs/` (~197 page folders) imported from barrels. That is a blessed escape hatch.

Declare extra trees in `anza.json` so tooling can hint without guessing:

```json
{
  "$schema": "./node_modules/@anzaui/anza/schemas/anza.schema.json",
  "pages": ["pages", "docs"]
}
```

Undeclared trees that still call `page()` keep working at runtime; `anza check` **warns** (doctor soft-exit) so large apps are nudged to declare `pages[]` without blocking build unless `--strict` / `check`.

---

## Service workers

| Slot | Path | Role |
| ---- | ---- | ----- |
| Primary entry (recommended) | `src/sw.js` | Single controlling SW; build entry when `anza.json` omits `sw` |
| Shared modules (optional) | `src/sw/` | Helpers imported by the entry — **not** separate registrations |
| Do not standardize | `src/workers/` | Conflates Web Workers; Anza vocabulary is `sw` |

**One registration per scope** in the browser. Split cache strategies inside one worker with ESM imports + `router().register(...)`, not by inventing a second worker. Use multiple workers only for **distinct URL scopes** (e.g. `/` vs `/admin/`).

### `anza.json` `sw`

String (scaffold back-compat):

```json
{ "sw": "sw.js" }
```

Array of paths and/or `{ path, scope }` objects:

```json
{
  "sw": [
    "sw.js",
    { "path": "admin/sw.js", "scope": "/admin/" }
  ]
}
```

Omit `sw` entirely → tooling looks for `src/sw.js`. Registration stays in app code (`navigator.serviceWorker.register`); `scope` in the manifest is advisory for humans and future generators.

---

## Optional `anza.json`

```json
{
  "$schema": "./node_modules/@anzaui/anza/schemas/anza.schema.json",
  "src": "src",
  "entry": "app.js",
  "shell": "index.html",
  "rootDock": "main",
  "pages": ["pages", "docs"],
  "docks": "docks",
  "views": "views",
  "parts": "parts",
  "tokens": "tokens",
  "styles": "styles",
  "sw": "sw.js"
}
```

All path values are relative to `src` except project-root files (`importmap.json`, `ssg.json`). Omit keys to keep defaults. Schema: [`library/schemas/anza.schema.json`](../../library/schemas/anza.schema.json).

### Schema / IDE association

Package export: `@anzaui/anza/schemas/anza.schema.json`.

Point the `$schema` key in `anza.json` (as above), or teach the editor via `.vscode/settings.json`:

```json
{
  "json.schemas": [
    {
      "fileMatch": ["anza.json"],
      "url": "./node_modules/@anzaui/anza/schemas/anza.schema.json"
    }
  ]
}
```

A mergeable fragment ships as `@anzaui/anza/schemas/vscode-json-schemas.json`.

---

## Troubleshooting

### Moved pages out of `src/pages/`

Symptoms: `anza check` warns about `page()` under `src/<tree>/` not listed in `pages[]`; routes missing after build if the barrel is not imported.

Fix (pick one or both):

1. **Declare the tree** in `anza.json`:

```json
{
  "$schema": "./node_modules/@anzaui/anza/schemas/anza.schema.json",
  "pages": ["pages", "docs"]
}
```

2. **Import the barrel** from entry (or from `src/pages/index.js`):

```javascript
// src/app.js
import './docs/index.js';
```

Runtime only needs the import graph. Declaring `pages[]` silences the check warn and helps future generators.

### `via` name has no matching `dock()`

Register the dock anywhere under `src/` (often `app.js`):

```javascript
dock('main');
```

Or fix the page `via: ['…']` to match an existing registry key. Folder under `src/docks/` is optional.

### Missing recommended tokens / styles / SW

Copy from a fresh `anza create`, or drop the slot if you intentionally skip offline / design tokens (warn-only unless `anza check`).

---

## Fallbacks are not folders

Miss / error / offline UI is **by reference** (dock/page options or library built-ins). Do **not** copy `404.html` into every dock folder. Scaffold correctly creates docks without error-page files. See [router/fallbacks.md](../router/fallbacks.md) and [router/docks.md](../router/docks.md).

---

## Tokens and styles

`src/tokens/` and `src/styles/` are copied from the library during scaffolding. You own them — the CLI never overwrites them after creation.

```text
src/tokens/
  index.css
  primitives/
  registered/
  semantic/

src/styles/
  index.css
  layers.css
  reset.css
  base.css
```

---

## Build output

`npm run dev` and `npm run build` emit to `dist/`:

```text
dist/
  index.html
  importmap.json
  app.js
  sw.js
  sw/                    # Copied SW library modules
  pages/
  tokens/
  styles/
  types/
```

The folder structure mirrors `src/`. Serve `dist/` as the document root. Public URLs are `/app.js`, `/importmap.json`, `/tokens/...` — not `/dist/app.js`. Mode A SSG writes contentful HTML per public route; soft-nav uses page fragments (`template.html` when the fragment path collides with SSG `index.html`).
