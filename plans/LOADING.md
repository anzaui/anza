# Per-dock loading UI

Soft-nav loading indicators scoped to the **leaf dock** while page resources fetch (module, `template.html`, styles).

## Defaults (zero config)

- Built-in CSS spinner (`.anza-loading`) shows automatically on soft-nav when no dock/page override is set.
- Scaffold apps copy `styles/` (including `loading.css`) and link `/styles/index.css` in the shell — styles are on **first page load**, so soft-nav can show the spinner immediately.
- `router.loading.ensureStyles()` (also auto-called on router import) injects a minimal fallback if the shell omitted `loading.css`.
- Hard refresh / boot never covers SSG HTML.

## When loading shows

| Trigger | Shows loader? |
|---------|---------------|
| Soft-nav (`push`, `replace`, `traverse`) | Yes — in leaf dock from `via` chain |
| Boot / SSG adopt (`direction: 'load'`) | No — pre-rendered content stays visible |
| Hard refresh via Navigation API (`reload`) | No — same as boot |
| `loading: false` on dock/page subtree | No |

Timing: after the via chain is ensured, `beginLoading()` runs (before guards / `found`). `endLoading()` runs after the page element fires `anza:ready` (or early on error / adopt same leaf). Dock `swap` / orchestrator keep `.dock-loading` nodes across the page mount so the spinner stays up through template/CSS fetch.

## Override ladder (highest wins)

1. **Page** — `page('/path', { loading: … })`
2. **Dock chain** — deepest live dock in `via` that defines `loading` (leaf → root)
3. **App default** — `router.loading.configure({ tag: 'ui-spinner' })`
4. **Built-in** — `.anza-loading` spinner HTML (always available)

Shapes: `false` (disable), tag string, `{ tag: 'ui-spinner', props?: {} }`, `{ html: '…' }`.

```javascript
// Optional override — not required for create apps
import { dock } from '@anzaui/anza/ui';
import '@anzaui/anza/elements/spinner';

dock('main', { loading: { tag: 'ui-spinner' } });
```

## Styling hooks

- `[data-loading]` + `aria-busy="true"` on the dock host
- `.dock-loading` on the injected node (`data-loading-kind="nav"`)
- `[data-loading] > .page-content` is hidden while the spinner is active
- Override host chrome: `[data-loading] { opacity: 0.85; }`

## Docs site

`web/src/docks/content/index.js` — `loading: { tag: 'ui-spinner' }` on the docs content dock (override example).
