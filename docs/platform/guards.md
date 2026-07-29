# Guards

> **Not navigation guards.** Platform `guard` / `typeGuard` / `supports` load polyfills and assert capabilities. For route protection and redirects, see [router/guards.md](../router/guards.md).

The `guard` object provides asynchronous feature gates. Each method checks native support and either returns the native API or dynamically imports a polyfill.

```javascript
import { guard, escapeOverflow } from '@adukiorg/anza/platform';
```

Full signatures: [API Reference](api.md).

---

## urlPattern

```javascript
const URLPattern = await guard.urlPattern();
const pattern = new URLPattern({ pathname: '/user/:id' });
```

Returns the native `URLPattern` class or loads the polyfill. Used by the router for pathname matching.

---

## navigation

```javascript
const nav = await guard.navigation();
nav.navigate('/settings');
```

Returns `window.navigation` or bootstraps the Navigation API polyfill. Used by the router for history management.

---

## popover

```javascript
await guard.popover();
document.getElementById('menu').showPopover();
```

Installs `HTMLElement` popover prototype methods if missing. Provides light-dismiss behavior and memory-safe cleanup via the framework `globals` registry (`popover.target-click`, `popover.body-mo:*`). Used by `ui-popover`, `ui-menu`, `ui-tooltip`, and `ui-select`.

---

## shadow

```javascript
await guard.shadow(document);
```

Applies the declarative shadow DOM polyfill to a root element. Parses `<template shadowrootmode="open">` nodes.

---

## anchor

```javascript
await guard.anchor(floatingEl, anchorEl, {
  placement: 'bottom-start',
  mode: 'fixed',
  offset: 8
});
```

Computes dynamic anchor positioning for floating elements when native CSS anchor positioning is unavailable (or when `mode: 'fixed'`). Supports `mode: 'absolute'` (default, document coords) and `mode: 'fixed'` (viewport coords). Placement strings: `top` / `bottom` / `left` / `right` plus `-start` / `-end`.

For show/hide lifecycle + overflow escape, prefer [`guard.escape`](#escape) / `escapeOverflow`.

---

## escape

Positions a floating node so it can escape `overflow` clipping. Prefers Popover top-layer when the floating element has `[popover]` and `showPopover` is available; otherwise uses viewport-fixed coordinates. Not a body portal — the node stays in-tree.

```javascript
const tip = document.querySelector('.tip'); // [popover="manual"]
const anchor = document.querySelector('.trigger');

const ctrl = await guard.escape(tip, anchor, {
  placement: 'top',
  offset: 8,
  signal: el.ctrl.signal
});

ctrl.show();
// …
ctrl.hide();
// or ctrl.release() on teardown
```

### Options

| Option | Default | Description |
| ------ | ------- | ----------- |
| `placement` | `'top'` | Side relative to the anchor |
| `offset` | `8` | Gap in CSS pixels |
| `signal` | — | Abort → `release()` |
| `strategy` | auto | `'popover'` \| `'fixed'` |
| `cssAnchor` | unset | Pass `true` to leave placement to native CSS Anchor Positioning when supported |

### Controller

`{ show, hide, update, release, strategy, open }` — see [API Reference](api.md#escapeoverflowfloating-anchor-options).

### Sync form

```javascript
import { escapeOverflow, guard } from '@adukiorg/anza/platform';

await guard.popover(); // ensure polyfill if you rely on [popover]
const ctrl = escapeOverflow(tip, anchor, { placement: 'bottom' });
ctrl.show();
```

### Advanced — custom floating UI (same path as `ui-tooltip`)

```javascript
import { guard } from '@adukiorg/anza/platform';

async function bindHint(host, tip, wrapper) {
  if (!tip.hasAttribute('popover')) {
    tip.setAttribute('popover', 'manual');
  }

  let controller = null;

  async function ensure() {
    if (controller) return controller;
    controller = await guard.escape(tip, wrapper, {
      placement: host.getAttribute('placement') || 'top',
      offset: 8,
      signal: host.ctrl.signal
    });
    return controller;
  }

  wrapper.addEventListener('pointerenter', async () => {
    (await ensure()).show();
  }, { signal: host.ctrl.signal });

  wrapper.addEventListener('pointerleave', () => {
    controller?.hide();
  }, { signal: host.ctrl.signal });

  host.ctrl.signal.addEventListener('abort', () => {
    controller?.release();
    controller = null;
  }, { once: true });
}
```

Used by `ui-tooltip`. Kit architecture: [Overlay patterns](../elements/overlay.md). Element page: [tooltip](../elements/tooltip.md).

---

## sanitizer

```javascript
const sanitizer = await guard.sanitizer();
const clean = sanitizer.sanitizeToString('<p>Safe</p>');
```

Returns a sanitizer wrapper with `.sanitizeToString(input)`. Uses the native `Sanitizer` API when available, falls back to `DOMPurify` or a textContent-based sanitizer.

---

## scheduler

```javascript
const scheduler = await guard.scheduler();
scheduler.postTask(fn, { priority: 'user-visible' });
```

Returns `globalThis.scheduler` or loads the polyfill. Supports three priorities: `user-blocking`, `user-visible`, `background`.

---

## yield

```javascript
await guard.yield();
```

Yields execution control back to the event loop. Equivalent to `scheduler.yield()` when available, otherwise falls back to `setTimeout(..., 0)`.

Use inside heavy loops to prevent UI freezing:

```javascript
for (let i = 0; i < 10000; i++) {
  process(i);
  if (i % 100 === 0) await guard.yield();
}
```

---

## Related

- [API Reference](api.md)
- [Supports](supports.md) (`popoverAPI`, `anchorPositioning`)
- [Overlay patterns](../elements/overlay.md)
- [Tooltip](../elements/tooltip.md)
- [Memory safety & framework globals](../ui/advanced.md)
