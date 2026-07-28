# Structure

When you run `npm create @adukiorg/anza myapp`, the scaffold generates a folder layout the CLI expects. Here is what each file and folder does.

---

## Root Files

| File | Why it exists |
| ------ | ------------- |
| `package.json` | Lists `@adukiorg/anza` as a dev dependency and exposes `npm run dev` and `npm run build` |
| `importmap.json` | Empty starter for user-defined import aliases. The CLI merges library mappings in at build time |
| `.gitignore` | Excludes `node_modules/`, `dist/`, and `.anzacache.json` |

---

## `src/` Folder

| Folder | Why it exists |
| ------ | ------------- |
| `src/app.js` | Entry point. Initializes the UI system, defines the root layout dock, and imports all pages |
| `src/index.html` | HTML shell. Links the generated importmap, tokens, styles, and the app entry module |
| `src/pages/` | Route definitions. Each subfolder is a page with its own `.js`, `.html`, and `.css` |
| `src/docks/` | Container shells that persist across route changes (optional) |
| `src/views/` | Reusable stateful components, shared across pages (optional) |
| `src/parts/` | Atomic stateless primitives like buttons or badges (optional) |
| `src/elements/` | Legacy element definitions, migratable to views or parts (optional) |
| `src/tokens/` | Design tokens — CSS custom properties for colors, spacing, typography, motion |
| `src/styles/` | Global styles — browser reset, cascade layers, base element defaults |
| `src/sw.js` | Service Worker entry — caching strategies, route interception, background sync |

---

## What `npm create @adukiorg/anza` Generates

### `src/app.js`

```javascript
import '@adukiorg/anza/ui';
import { dock } from '@adukiorg/anza/ui';

navigator.serviceWorker.register('/sw.js');

dock('main');

import './pages/index.js';
```

This bootstraps the framework, registers the Service Worker, and creates a `main` dock. All pages render through this dock by default.

### `src/index.html`

```html
<script type="importmap" src="/importmap.json"></script>
<link rel="stylesheet" href="/tokens/index.css">
<link rel="stylesheet" href="/styles/index.css">
<script type="module" src="/app.js"></script>
```

The shell loads the importmap, design tokens, global styles, and the app entry. The CLI injects the HMR script in dev mode.

### `src/sw.js`

```javascript
import { precache, router, CacheFirst, NetworkFirst, pruneStale, claim } from '@adukiorg/anza/sw';

const SHELL = 'shell-v1';
const API = 'api-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(precache(SHELL, ['/index.html', '/app.js', '/tokens/index.css', '/styles/index.css']));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(Promise.all([pruneStale(SHELL), claim()]));
});

const r = router();
r.register('/*', new CacheFirst(SHELL));
r.register('/api/*', new NetworkFirst(API, { timeout: 3000 }));

self.addEventListener('fetch', (e) => {
  if (r.handle(e)) return;
  e.respondWith(fetch(e.request));
});
```

Pre-caches the app shell and cleans up old caches on update. Static assets use `CacheFirst`; API calls use `NetworkFirst` with a 3-second timeout.

### `src/pages/entry/index.js`

```javascript
import { page } from '@adukiorg/anza/ui';

page('/', {
  tag: 'page-welcome',
  via: ['main'],
  template: { html: './index.html', css: './index.css' }
}, import.meta.url);
```

Defines the `/` route. `via: ['main']` tells the router to mount this page inside the `main` dock. `import.meta.url` makes relative paths resolve from this file.

### `src/pages/entry/index.html` and `index.css`

The markup and styles for the welcome page. They are referenced by the `template` option above. You can delete them and use inline strings instead.

### `src/pages/index.js`

The barrel file. It imports every page folder so `app.js` only needs one import:

```javascript
import './entry/index.js';
```

This pattern scales: add a new folder, import it here, and the route registers automatically. The `entry/` name is just a convention. Rename it, replace it, or remove it entirely — whatever defines `/` in this barrel becomes your landing page.

---

## Tokens and Styles

`src/tokens/` and `src/styles/` are copied from the library during scaffolding. You own them — the CLI never overwrites them after creation.

```text
src/tokens/
  index.css           # Imports all token files
  primitives/
    colors.css        # Raw color palette
    spacing.css       # Space scale (4, 8, 16...)
    typography.css    # Font sizes, weights, line heights
    motion.css        # Durations and easing curves
    radius.css        # Border radius scale
    shadow.css        # Box shadow scale
    zindex.css        # Z-index layers
  registered/
    colors.css        # Houdini typed custom properties for color
    dimensions.css    # Houdini typed custom properties for length
  semantic/
    light.css         # Light mode color mappings
    dark.css          # Dark mode color mappings
    contrast.css      # High contrast overrides
    components.css    # Component-specific token assignments
    transitions.css   # View Transition timing and backdrop tokens

src/styles/
  index.css           # Imports reset, layers, and base
  layers.css          # @layer declarations (reset, tokens, base, components...)
  reset.css           # Normalize and reset inside the reset layer
  base.css            # Root and body defaults inside the base layer
```

---

## Build Output

`npm run dev` and `npm run build` emit to `dist/`:

```text
dist/
  index.html              # HTML with injected importmap link
  importmap.json         # Generated library mappings
  app.js                 # Entry and all resolved dependencies
  sw.js                  # Service Worker entry with rewritten imports
  sw/                    # Copied SW library modules
  pages/
    index/
      index.js
      index.html
      index.css
  tokens/                # Copied from src/tokens/
  styles/                # Copied from src/styles/
  types/
    index.d.ts           # Global HTMLElementTagNameMap augmentation
```

The folder structure mirrors `src/`. Serve `dist/` from any static host.
