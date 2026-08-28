# API Reference

Complete reference for the platform module.

## Named Exports

```javascript
import {
  supports,
  guard,
  reset,
  typeGuard,
  globals,
  escapeOverflow,
  attach,
  detach,
  count,
  list,
  clearGlobals
} from '@anzaui/anza/platform';
```

`attach` / `detach` / `count` / `list` / `clearGlobals` are also available as `globals.attach`, `globals.detach`, and so on.

### `supports`

Lazy-evaluated feature detection object. See [supports.md](supports.md) for the full flag list. Overlay-related flags: `popoverAPI`, `anchorPositioning`.

### `globals`

Internal framework attachment registry (nav polyfill, container MO, popover polyfill). App code should prefer component `on` / `watch` / `events.*` with AbortSignal. Soft-nav tests assert `globals.count()` stays stable across leaf swaps.

```javascript
import { globals } from '@anzaui/anza/platform';

globals.count(); // number of named framework attachments
globals.list();  // [{ name, type, target }, …]
// attach / detach / clear — framework and tests only
```

Named attachments today include `router.nav-click`, `router.nav-popstate`, `router.container-mo`, `popover.target-click`, and `popover.body-mo:*`. See [Memory safety & framework globals](../ui/advanced.md#framework-global-listeners--observers).

### `guard.urlPattern()`

Returns `Promise<URLPatternClass>`.

### `guard.navigation()`

Returns `Promise<navigationObject>`.

### `guard.popover()`

Returns `Promise<void>`. Installs the Popover API polyfill when missing (prototype methods + light-dismiss). Eager bootstrap also runs on module load in browsers that lack native support.

### `guard.shadow(root)`

Returns `Promise<void>`. Applies declarative shadow DOM polyfill to root (default `document`).

### `guard.anchor(floating, anchorEl, options)`

Returns `Promise<void>`. When CSS Anchor Positioning is unavailable (or `options.mode === 'fixed'`), computes coordinates via the anchor polyfill.

| Option | Default | Description |
| ------ | ------- | ----------- |
| `placement` | `'bottom-start'` | `top` / `bottom` / `left` / `right` plus `-start` / `-end` |
| `offset` | `8` | Gap in CSS pixels |
| `mode` | `'absolute'` | `'absolute'` (document coords) or `'fixed'` (viewport) |

### `guard.escape(floating, anchorEl, options)`

Returns `Promise<EscapeController>`. Ensures Popover polyfill when `floating` has `[popover]`, then builds an overflow-escape controller (same as `escapeOverflow`). Used by `ui-tooltip`.

See [escapeOverflow](#escapeoverflowfloating-anchor-options) below for options, controller shape, strategies, and samples. Narrative usage: [guards.md](guards.md#escape). Overlay kit context: [Overlay patterns](../elements/overlay.md), [tooltip](../elements/tooltip.md).

### `escapeOverflow(floating, anchor, options)`

**Sync** overflow-escape helper. Prefer `guard.escape` when you need the popover polyfill applied first; call `await guard.popover()` yourself if you use this sync form with `[popover]` in older browsers.

Positions `floating` relative to `anchor` so typical `overflow: hidden` ancestors do not clip it. The floating node stays **in-tree** (often in shadow) — this is not a `document.body` portal.

#### Options (`EscapeOptions`)

| Option | Default | Description |
| ------ | ------- | ----------- |
| `placement` | `'top'` | Anchor side: `top`, `bottom`, `left`, `right`, plus `-start` / `-end` |
| `offset` | `8` | Gap in CSS pixels between anchor and float |
| `signal` | — | `AbortSignal`; abort calls `release()` |
| `strategy` | auto | Force `'popover'` or `'fixed'`. Auto: popover when `showPopover` + `[popover]` exist, else fixed |
| `cssAnchor` | unset | Pass `true` to skip JS placement when `supports.anchorPositioning` and strategy is `'popover'` (author CSS Anchor Positioning). Default / other values keep JS `position(…, { mode: 'fixed' })` |

#### Controller (`EscapeController`)

| Member | Kind | Description |
| ------ | ---- | ----------- |
| `show()` | method | Opens (popover or fixed), positions, attaches scroll/resize reposition |
| `hide()` | method | Closes, clears inline position / markers, detaches reposition listeners |
| `update()` | method | Re-run placement while open |
| `release()` | method | Same as `hide()` (for AbortSignal / teardown) |
| `strategy` | getter | `'popover'` \| `'fixed'` (may fall back to `'fixed'` if `showPopover` throws) |
| `open` | getter | Whether currently shown |

Markers while open (fixed path): `data-escape-fixed`, `data-escape-open`. Cleared on hide.

#### Simple sample

```javascript
import { guard } from '@anzaui/anza/platform';

const tip = document.querySelector('#tip');   // [popover="manual"]
const anchor = document.querySelector('#btn');

const ctrl = await guard.escape(tip, anchor, {
  placement: 'top',
  offset: 8
});

ctrl.show();
// …
ctrl.hide();
```

#### Advanced sample (AbortSignal + fixed strategy)

```javascript
import { escapeOverflow, guard } from '@anzaui/anza/platform';

await guard.popover(); // if you use sync escapeOverflow with [popover]

const ctrl = escapeOverflow(tip, anchor, {
  placement: 'bottom-start',
  offset: 12,
  strategy: 'fixed', // force viewport-fixed even when popover exists
  signal: el.ctrl.signal
});

ctrl.show();
window.addEventListener('scroll', () => ctrl.update(), {
  capture: true,
  signal: el.ctrl.signal
});
// abort / soft-nav → release(); scroll/resize listeners from the helper also detach on hide
```

Missing `floating` or `anchor` returns a no-op controller (`strategy: 'fixed'`, `open: false`).

### `guard.sanitizer()`

Returns `Promise<{ sanitizeToString(input) }>`. Native `Sanitizer` when available; otherwise `DOMPurify` if present, else a textContent escape.

### `guard.scheduler()`

Returns `Promise<schedulerObject>`.

### `guard.yield()`

Returns `Promise<void>`. Yields to the event loop.

### `reset(key)`

Clears cached detection value for a flag.

```javascript
reset('urlPattern');
```

### `typeGuard(key, message)`

Throws if the feature is not supported.

```javascript
typeGuard('opfs', 'File storage is required');
```

## Scheduler Polyfill API

When native `scheduler` is unavailable, the polyfill exposes:

```javascript
scheduler.postTask(fn, { priority, delay, signal })
scheduler.yield()
```

Priorities: `user-blocking`, `user-visible`, `background`.

## Related

- [Guards](guards.md) — narrative usage for each `guard.*` method
- [Supports](supports.md) — capability flags
- [Overlay patterns](../elements/overlay.md) — kit architecture (`ui-tooltip` uses escape)
- [Memory safety & framework globals](../ui/advanced.md)
