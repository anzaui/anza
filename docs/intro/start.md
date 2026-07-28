# Start

Create a new Anza app and run it.

---

## Scaffold

```bash
npm create @adukiorg/anza myapp
cd myapp
npm install
```

This generates:

| Path | Purpose |
| ------ | ------- |
| `src/app.js` | Entry point — imports the UI system and defines a layout dock |
| `src/index.html` | HTML shell with importmap, tokens, styles, and module script |
| `src/sw.js` | Service Worker entry — caching, routing, sync |
| `src/pages/entry/index.js` | Landing page definition |
| `src/pages/entry/index.html` | Landing page markup |
| `src/pages/entry/index.css` | Landing page styles |
| `src/tokens/` | Design tokens copied from the library (colors, spacing, typography) |
| `src/styles/` | Global styles copied from the library (reset, layers, base) |
| `importmap.json` | Empty starter for custom aliases |
| `package.json` | Scripts: `dev` and `build` |

You own `src/tokens/` and `src/styles/`. The library copies them in as starter files; change them freely.

---

## Run

```bash
npm run dev
```

Opens a dev server on `http://localhost:3000` with:

- Import graph resolution into `dist/`
- Separate `dist/importmap.json` linked from HTML
- CSS hot-swapping via SSE
- JS and HTML auto-reload on change

---

## What Was Generated

### `src/app.js`

```javascript
import '@adukiorg/anza/ui';
import { dock } from '@adukiorg/anza/ui';

// Register the Service Worker
navigator.serviceWorker.register('/sw.js');

// Layout shell
dock('main');

import './pages/index.js';
```

This initializes the UI system, registers the Service Worker, creates a `main` dock, and loads the welcome page.

### `src/pages/entry/index.js`

```javascript
import { page } from '@adukiorg/anza/ui';

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
import { page } from '@adukiorg/anza/ui';

page('/', {
  tag: 'page-home',
  via: ['main'],
  template: '<h1>Home</h1>'
});
```

---

## Next

Add a new page:

```javascript
import { page } from '@adukiorg/anza/ui';

page('/about', {
  tag: 'page-about',
  via: ['main'],
  template: '<h1>About</h1>'
});
```

Clicking `<a href="/about">` is intercepted, matched, and soft-nav swaps only the page leaf inside `main` — the dock stays mounted. Both `anza dev` and `anza build` emit contentful SSG HTML per public route for hard refresh; soft-nav loads page fragments (see [ssg/contract.md](../ssg/contract.md)).
