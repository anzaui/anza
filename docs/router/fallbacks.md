# Fallbacks (404 / 5xx / offline)

Miss, navigation error, and offline leaves share one resolver for soft-nav and hard boot. Soft-nav swaps the **leaf** dock only — parent chrome stays.

Built-ins live in `library/src/core/router/pages.js` (`DEFAULT_*_HTML`). They are **not** copied into each dock folder and are **not** filesystem slots in the [structure contract](../intro/structure.md).

## Kinds

| Kind | When | Event | Default host |
| ---- | ---- | ----- | ------------ |
| `notfound` | No route matches | `notfound` | Deepest live dock in active `via` / `lastVia` |
| `error` | Guard / match / handler / navigation throws | `error` (`phase`) | Same leaf host |
| `offline` | App / SW bridge calls `router.pages.show('offline')` (or you mount it) | — | Same leaf host |

Override shapes (any kind): HTML string, `{ html }`, or `{ tag, props? }`. Prefer a custom **`view`** / **`page`** tag over raw HTML when you need lifecycle or props.

## How defaults work

| Fact | Detail |
| ---- | ------ |
| Source | Shared `DEFAULT_NOTFOUND_HTML` / `DEFAULT_ERROR_HTML` / `DEFAULT_OFFLINE_HTML` |
| Bare docks | `dock('name')` / `dock('content', { parent: 'docs' })` get miss/error/offline UI **for free** |
| Host | Always the **leaf** dock in the active `via` (deepest live container) |
| Template | May come from a shallower dock in the chain (leaf → root walk) while still painting into the leaf host |
| Scaffold | Creates bare docks with **no** `404.html` / error-page files — that is correct |
| Do not | Copy `404.html` (or error/offline HTML) into every dock folder |

Override only when you need branded UI: dock/page `{ notfound \| error \| offline: { tag } }` (or HTML). Overrides stay dock/page-scoped.

## Override ladder (highest wins)

1. **Page/route** — `page({ error: { tag } })` (error kind only; route matched then failed)
2. **Dock** — `dock('content', { notfound \| error \| offline })` — walk leaf → root; deepest dock that defines the kind supplies the **template**
3. **App (optional)** — `router.pages.configure({ … })` when no dock in the chain defines the kind
4. **Built-in** — shared library HTML for that kind

**Host** is always the deepest live dock in the active `via` chain. An ancestor’s template may paint into that leaf without replacing the shell.

Escape hatches (`router.notFound(fn)`, `router.pages.onError(fn)`) may return `false` to fall through to auto-mount. Prefer dock / `configure` tags for normal apps.

## Simple: bare docks (library defaults)

```javascript
import { dock, page } from '@anzaui/anza/ui';

dock('main');
dock('docs', { parent: 'main', template: '<aside></aside><slot></slot>' });
dock('content', { parent: 'docs' });

page('/docs/:slug', {
  tag: 'page-doc',
  via: ['main', 'docs', 'content'],
  template: { html: './doc.html' }
}, import.meta.url);
```

Unmatched `/docs/…`: resolver mounts the shared built-in 404 into **content**; docs sidebar and main shell stay. No per-dock error HTML files.

## Advanced: branded override (dock / page scoped)

```javascript
import { view, dock, page } from '@anzaui/anza/ui';
import { router } from '@anzaui/anza/router';

view('page-docs-not-found', {
  template: { html: './docs-404.html' }
}, import.meta.url);

view('page-docs-error', {
  template: { html: './docs-error.html' },
  props: {
    message: { type: String, default: '' },
    phase: { type: String, default: '' }
  }
}, import.meta.url);

dock('main', { template: '<slot></slot>' });

dock('docs', {
  parent: 'main',
  template: '<aside id="sidebar"></aside><slot></slot>'
});

// Override only where branding matters — still leaf-hosted
dock('content', {
  parent: 'docs',
  notfound: { tag: 'page-docs-not-found' },
  error: { tag: 'page-docs-error' }
});

page('/docs/:slug', {
  tag: 'page-doc',
  via: ['main', 'docs', 'content'],
  error: { tag: 'page-docs-error' },
  template: { html: './doc.html' }
}, import.meta.url);

// Optional shared kinds when some docks omit config
router.pages.configure({
  offline: { tag: 'page-offline' }
});
```

Unmatched `/docs/…` soft-nav: **content** shows `page-docs-not-found`; docs sidebar stays.

Tag materialization sets `data-fallback-kind`, class `page-content`, and for errors copies `message` / `phase` onto the element from the navigation context. Optional `props` on the override are assigned onto the created element.

## Optional app-wide fallback

```javascript
router.pages.configure({
  notfound: { tag: 'page-not-found' },
  error: { tag: 'page-server-error' },
  offline: { tag: 'page-offline' }
});
```

Still mounts into the **leaf** dock of the active chain — not a document-level wipe. `configure` returns a disposer that clears the kinds you set. Use when several docks omit a kind and you want one branded default without repeating dock config.

## API surface

```javascript
import { router } from '@anzaui/anza/router';

// App-level overrides (step 3 of the ladder)
const dispose = router.pages.configure({
  notfound: { tag: 'page-not-found' },
  error: { html: '<p role="alert">Something went wrong</p>' },
  offline: { tag: 'page-offline' }
});

// Explicit show (offline banner, tests, bridges)
await router.pages.show('offline', {
  via: ['main', 'docs', 'content'],
  signal: ctrl.signal
});

// Escape hatches — return false to fall through to dock/app/built-in
router.notFound(async (ctx) => {
  // ctx.host = leaf dock; ctx.hostName; ctx.override = chosen template
});
router.pages.onError(async (ctx) => false);
router.pages.suppressDefault(true); // skip auto error mount (error kind only)

// Aliases
router.miss.set(fn);   // same as router.notFound
router.miss.clear();
```

`show` / `renderPageKind` honor `ctx.signal` (abort skips mount) and prefer `host.swap` / `host.swapView` with `{ direction: 'replace', signal }` so VT + soft-nav abort stay consistent.

## Escape hatches

```javascript
router.notFound(async (ctx) => {
  // return false to fall through to dock/app/built-in into ctx.host (leaf)
});

router.pages.onError(async (ctx) => {
  // return false to fall through
});

router.pages.suppressDefault(true);
router.pages.show('offline', { via: ['main', 'docs', 'content'] });
```

Prefer dock / `configure` tags for normal apps. Handlers are for full manual control (analytics side effects, custom swap, etc.).

## Soft-nav / SSG / guards

| Context | Behavior |
| ------- | -------- |
| Soft-nav miss / error | Leaf swap inside deepest `via` dock; parents stay; VT + `signal` honored |
| Hard refresh miss | Same resolver after boot gates |
| Guard throws | `error` event with `phase: 'guard'` → error leaf ([guards.md](guards.md)) |
| SSG / static host | Unknown URL may be host `404` or SPA shell; CSR paints the dock-scoped leaf after boot |
| Scaffold | Bare `dock('main')` — no error-page files in `src/docks/` |

Host HTML 404 and Mode A SSG emission are separate from this CSR leaf resolver. See [ssg/index.md](../ssg/index.md).

## Related

- [docks.md](docks.md) — `notfound` / `error` / `offline` on docks
- [pages.md](pages.md) — `page()` and route `error`
- [events.md](events.md) — `notfound` / `error` events
- [guards.md](guards.md) — nav guards (throws → error leaf)
- [intro/structure.md](../intro/structure.md) — fallbacks are not folder slots
