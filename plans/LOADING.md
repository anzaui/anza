# Per-dock loading UI

Soft-nav loading indicators scoped to the **leaf dock** while page resources fetch (module, `template.html`, styles).

## When loading shows

| Trigger | Shows loader? |
|---------|---------------|
| Soft-nav (`push`, `replace`, `traverse`) | Yes — in leaf dock from `via` chain |
| Boot / SSG adopt (`direction: 'load'`) | No — pre-rendered content stays visible |
| Hard refresh via Navigation API (`reload`) | No — same as boot |
| `loading: false` on dock/page subtree | No |

Timing: `beginLoading()` runs at the start of the intercept pipeline (before container ensure + guards). `endLoading()` runs after the page element fires `anza:ready` (or early on error / adopt same leaf).

## Override ladder (highest wins)

1. **Page** — `page('/path', { loading: … })`
2. **Dock chain** — deepest live dock in `via` that defines `loading` (leaf → root)
3. **App default** — `router.loading.configure({ tag: 'ui-spinner' })`
4. **Built-in** — minimal `.anza-loading` spinner HTML

Shapes: `false` (disable), tag string, `{ tag: 'ui-spinner', props?: {} }`, `{ html: '…' }`.

## Bootstrap (styled by default)

New apps link `/styles/index.css`, which includes `loading.css` (`[data-loading]`, `.dock-loading`, `.anza-loading`). Import custom loader elements **before** first navigation:

```javascript
// src/docks/main/index.js
import { dock } from '@adukiorg/anza/ui';
import '@adukiorg/anza/elements/spinner';

dock('main', { loading: { tag: 'ui-spinner' } });
```

`router.loading.ensureStyles()` (also auto-called on router import) injects a minimal fallback if the shell omitted `loading.css`.

## Styling hooks

- `[data-loading]` + `aria-busy="true"` on the dock host
- `.dock-loading` on the injected node (`data-loading-kind="nav"`)
- Override host chrome: `[data-loading] { opacity: 0.85; }`

## Docs site

`web/src/docks/content/index.js` — `loading: { tag: 'ui-spinner' }` on the docs content dock.
