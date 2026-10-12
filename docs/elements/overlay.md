---
seo_title: "Overlay patterns — Anza"
description: "How the overlay elements share the top layer: popover vs dialog, the Popover polyfill, guard.escape for custom floats, and cleanup."
---

# Overlay patterns

How the overlay elements reach the top layer, how the Popover polyfill loads, and how to build your own floating UI the same way. Each element has its own reference page.

## Shared model

No overlay element moves itself to `document.body`. Each one keeps its surface in its shadow root and relies on a native top-layer API.

| Mechanism | Elements | Open with |
| --------- | -------- | --------- |
| `popover="auto"` (light dismiss) | [Popover](popover.md), [Menu](menu.md), [Select](select.md) | `show()` / `hide()` / `toggle()` |
| `popover="manual"` via `guard.escape` | [Tooltip](tooltip.md) | Hover or focus |
| Modal `<dialog>` (`showModal()`) | [Dialog](dialog.md) | `showModal()` / `close()` |
| Modal `<dialog>` driven by the `open` attribute | [Drawer](drawer.md), [Sheet](sheet.md) | `open` attribute, `show()` / `hide()` |
| Fixed container under `document.body` | [Toast](toast.md) via `showToast()` | `showToast()` |

The modal dialogs trap focus, make the page inert and close on Escape. `ui-dialog` opens only through `showModal()`; its `open` attribute just reflects the state. The popovers close on a click outside. Neither the popovers nor the menu position themselves next to a trigger; style their part to place them.

## Popover polyfill

`ui-popover`, `ui-menu`, `ui-select` and `ui-tooltip` import the platform module (`@anzaui/anza/platform`). When `supports.popoverAPI` is false, that module imports `polyfills/popover.js` as soon as it loads. `ui-popover`, `ui-menu` and `ui-select` also call `guard.popover()` when they mount, and the tooltip's `guard.escape()` calls it before the first show. The polyfill installs once.

The polyfill adds `showPopover()`, `hidePopover()`, `togglePopover()`, the `popover` property, `toggle` events with `oldState`/`newState`, and `popovertarget` click handling. It differs from the native API:

- An open popover gets `data-popover-open` (match it next to `:popover-open`), `position: fixed` and a maximum `z-index`. There is no real top layer.
- `auto` popovers close on a pointer press outside them. Escape does not close them, and opening one does not close another.
- A popover closes when it is removed from the document.

See [Guards](../platform/guards.md#popover).

## Custom floats

For your own tip or floating chip, use the helper the tooltip uses. It positions the float against an anchor and escapes `overflow` clipping without a body portal.

```javascript
import { guard } from '@anzaui/anza/platform';

const tip = document.querySelector('#hint'); // has popover="manual"
const anchor = document.querySelector('#target');
const ctrl = new AbortController();

const float = await guard.escape(tip, anchor, {
  placement: 'top',
  offset: 8,
  signal: ctrl.signal
});

anchor.addEventListener('pointerenter', () => float.show(), { signal: ctrl.signal });
anchor.addEventListener('pointerleave', () => float.hide(), { signal: ctrl.signal });
```

`guard.escape()` loads the Popover polyfill when the float has a `popover` attribute, then returns the controller from `escapeOverflow()`. The controller uses the `popover` strategy (top layer) when the float can call `showPopover()`, and otherwise the `fixed` strategy (`position: fixed`, `data-escape-open`). `show()` positions the float and listens to scroll and resize; `hide()` removes those listeners and clears the inline position; aborting `signal` calls `release()`. Options and placements: [API Reference](../platform/api.md#escapeoverflowfloating-anchor-options).

## Cleanup and globals

- The elements bind their listeners to the component `ctrl.signal`, so a soft navigation that removes them also removes the listeners. Pass `{ signal }` when you add `document` or `window` listeners around an overlay.
- The tooltip's scroll and resize listeners exist only while it is open.
- The Popover polyfill registers framework globals: `popover.target-click` once, and `popover.body-mo:<n>` (a MutationObserver) for each open popover, removed when it closes. List them with `globals.list()` from `@anzaui/anza/platform`.
- Toasts created by `showToast()` live under `document.body` and survive page swaps. Each removes itself after its `duration`.

See [Memory safety](../ui/lifecycle.md#memory-safety).

## Related

- [Elements](index.md#overlay)
- [Guards](../platform/guards.md)
- [Supports](../platform/supports.md)
- [Troubleshooting](../events/troubleshooting.md)
