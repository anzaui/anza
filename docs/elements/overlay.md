# Overlay

Layered UI in the kit: modals, menus, drawers, sheets, popovers, and tooltips. Full reference pages exist for every overlay tag ([dialog](dialog.md), [popover](popover.md), [tooltip](tooltip.md), [menu](menu.md), [drawer](drawer.md), [sheet](sheet.md)) plus [toast](toast.md) under Feedback. This page is the architecture / patterns reference for the whole overlay kit.

Import pattern:

```javascript
import '@anzaui/anza/elements/<name>';
```

## Architecture (actual kit model)

The kit does **not** use a shared body portal for overlays. Rendering strategies in source:

| Strategy | Mechanism | Elements | Top-layer? |
| -------- | --------- | -------- | ---------- |
| Native popover | `[popover]` + `showPopover()` / `hidePopover()` | `ui-popover`, `ui-menu` | Yes (native Popover API; polyfill when missing) |
| Native modal dialog | `<dialog>` + `showModal()` | `ui-dialog`, `ui-drawer`, `ui-sheet` | Yes (modal dialog top-layer + focus trap) |
| Tooltip escape | `popover="manual"` + `escapeOverflow` / `guard.escape` (fixed coords fallback) | `ui-tooltip` | Yes when Popover API/polyfill available; else viewport-fixed (still in-tree, not a body portal) |
| Body portal (exception) | Shared fixed container under `document.body` | `ui-toast` (`show` helper) | Fixed stacking (`z-index`), not Popover/dialog |

**Toast** is the deliberate portal exception — documented under [Feedback → toast](toast.md). Overlay elements stay in-tree and rely on native top-layer APIs (tooltip uses the platform escape helper rather than absolute CSS that clips).

`ui-select` (forms) also uses the Popover API for its dropdown; see [select](select.md).

## When to use which

| Need | Prefer | Why |
| ---- | ------ | --- |
| Confirm / blocking modal | `ui-dialog` | Focus trap, backdrop, Escape → `cancel` / `close` |
| Side panel | `ui-drawer` | `showModal()` + `placement` (`left` / `right`, default `right`) |
| Bottom sheet + drag dismiss | `ui-sheet` | Modal dialog + pointer drag on the handle |
| Anchored ephemeral panel | `ui-popover` | Light dismiss, top-layer, `toggle` event |
| Keyboard menu | `ui-menu` | Popover + roving tabindex, arrows / Home / End / Escape |
| Hover / focus hint | `ui-tooltip` | Escape helper + popover/fixed; short non-interactive hints |
| Transient status | `ui-toast` | Body portal + auto-dismiss — see [toast](toast.md) |

## Simple samples

### Dialog (full docs)

```html
<ui-dialog id="confirm">
  <h2>Confirm</h2>
  <p>Delete this item?</p>
  <ui-button type="button">Cancel</ui-button>
  <ui-button type="button">Delete</ui-button>
</ui-dialog>

<script type="module">
  import '@anzaui/anza/elements/dialog';
  document.querySelector('#confirm').showModal();
</script>
```

Methods: `showModal()`, `close(returnValue?)`. See [dialog](dialog.md).

### Popover

```html
<ui-button id="more" type="button">More</ui-button>
<ui-popover id="panel">
  <p>Contextual content</p>
</ui-popover>

<script type="module">
  import '@anzaui/anza/elements/popover';
  const panel = document.querySelector('#panel');
  document.querySelector('#more').addEventListener('click', () => panel.toggle());
  panel.addEventListener('toggle', (e) => {
    console.log(e.detail.newState); // 'open' | 'closed'
  });
</script>
```

Methods: `show()`, `hide()`, `toggle()`. Default slot projects into `part="popover"`. Full page: [popover](popover.md).

### Tooltip

```html
<ui-tooltip>
  <ui-button type="button">Save</ui-button>
  <span slot="content">Save changes</span>
</ui-tooltip>
```

Hover / focus shows the hint (`part="tooltip"`, `popover="manual"`). Positioning uses `escapeOverflow` so typical `overflow: hidden` ancestors do not clip the tip; fixed-position fallback when popover APIs are missing. Full page: [tooltip](tooltip.md).

## Advanced samples

### Menu with keyboard navigation

```html
<ui-button id="actions" type="button">Actions</ui-button>
<ui-menu id="menu">
  <ui-button type="button">Edit</ui-button>
  <ui-button type="button">Duplicate</ui-button>
  <ui-button type="button">Delete</ui-button>
</ui-menu>

<script type="module">
  import '@anzaui/anza/elements/menu';
  const menu = document.querySelector('#menu');
  document.querySelector('#actions').addEventListener('click', () => menu.toggle());
</script>
```

Slotted `ui-button` / `button` / `[role=menuitem]` get `role="menuitem"` and roving `tabindex`. Arrow keys, Home, End, and Escape are handled on the popover surface (`part="menu"`). Full page: [menu](menu.md).

### Drawer + sheet (modal dialog family)

```html
<ui-drawer id="nav-drawer" placement="left">
  <h2>Navigate</h2>
  <!-- side panel content -->
</ui-drawer>

<ui-sheet id="filters">
  <h2>Filters</h2>
  <!-- drag the handle to dismiss -->
</ui-sheet>

<script type="module">
  import '@anzaui/anza/elements/drawer';
  import '@anzaui/anza/elements/sheet';

  document.querySelector('#nav-drawer').show(); // sets open → showModal()
  document.querySelector('#filters').show();
  // hide() / open = false closes after the exit transition
</script>
```

Both sync `open` (Boolean, reflect) to native `dialog.showModal()` / `close()`, with a short CSS transition before close. Sheet adds drag-to-dismiss on `part="handle"` (threshold ~120px). Full pages: [drawer](drawer.md), [sheet](sheet.md).

### Custom float with `guard.escape` (same helper as tooltip)

Prefer `ui-tooltip` for hints. For a custom tip / chip that must escape `overflow` clipping without a body portal:

```javascript
import { guard } from '@anzaui/anza/platform';

const tip = document.querySelector('#hint');     // [popover="manual"]
const anchor = document.querySelector('#target');

const ctrl = await guard.escape(tip, anchor, {
  placement: 'top',
  offset: 8,
  signal: host.ctrl.signal // soft-nav / disconnect → release()
});

ctrl.show();   // popover top-layer, or fixed fallback
ctrl.update(); // after layout changes
ctrl.hide();   // clears position + scroll/resize listeners
```

Strategies: `'popover'` when `showPopover` + `[popover]` exist; otherwise `'fixed'` (`position: fixed` + `data-escape-open`). Sync form: `escapeOverflow` from `@anzaui/anza/platform` (call `await guard.popover()` first if you need the polyfill). Full API: [Platform API](../platform/api.md), [Guards → escape](../platform/guards.md#escape).

## Lifecycle / memory / globals

- Prefer component `on` / `watch` inside the overlay shadow. Soft-nav aborts the detached leaf’s `ctrl` and tears down signal-owned listeners.
- Do **not** attach raw `document` / `body` listeners from a leaf without `{ signal: ctrl.signal }`. Soft-nav will not clean those up.
- **Popover polyfill** (when Popover API is missing) registers framework-owned globals: `popover.target-click` and per-open `popover.body-mo:*` (prefers parent `childList` over `document.body` subtree). Inspect with `globals.count()` / `globals.list()` from `@anzaui/anza/platform`. Soft-nav must not grow that set.
- **Tooltip escape** attaches scroll/resize reposition listeners only while open and clears them on hide / `ctrl` abort — not a long-lived document attachment.
- **Toast** portals under `body` on purpose; dismiss timeouts clear on `el.ctrl.signal` abort. Own toast lifetime where it belongs — see [toast](toast.md).
- Deeper notes: [Memory safety & framework globals](../ui/advanced.md), [Orphan listeners after soft-nav](../events/troubleshooting.md).

## Parts (quick reference)

| Element | Notable `::part` names |
| ------- | ---------------------- |
| `ui-dialog` | `dialog` |
| `ui-popover` | `popover` |
| `ui-menu` | `menu` |
| `ui-drawer` | `dialog` |
| `ui-sheet` | `dialog`, `handle`, `content` |
| `ui-tooltip` | `wrapper`, `tooltip` |

## Elements

| Element | Tag | Import | Status |
| ------- | --- | ------ | ------ |
| [dialog](dialog.md) | `ui-dialog` | `@anzaui/anza/elements/dialog` | Full |
| [popover](popover.md) | `ui-popover` | `@anzaui/anza/elements/popover` | Full |
| [tooltip](tooltip.md) | `ui-tooltip` | `@anzaui/anza/elements/tooltip` | Full |
| [menu](menu.md) | `ui-menu` | `@anzaui/anza/elements/menu` | Full |
| [drawer](drawer.md) | `ui-drawer` | `@anzaui/anza/elements/drawer` | Full |
| [sheet](sheet.md) | `ui-sheet` | `@anzaui/anza/elements/sheet` | Full |

Related feedback portal: [toast](toast.md) (`ui-toast`).

See the [full inventory](index.md) and [ELEMENTS.md](../../plans/ELEMENTS.md) for phase status.

## Related

- [Dialog](dialog.md)
- [Popover](popover.md)
- [Tooltip](tooltip.md)
- [Menu](menu.md)
- [Drawer](drawer.md)
- [Sheet](sheet.md)
- [Toast](toast.md)
- [Select](select.md) (Popover API dropdown)
- [Platform API](../platform/api.md) (`escapeOverflow` / `guard.escape`)
- [Guards](../platform/guards.md) (`guard.popover`, `guard.escape`, `guard.anchor`)
- [Supports](../platform/supports.md) (`popoverAPI`, `anchorPositioning`)
- [Memory safety & framework globals](../ui/advanced.md)
- [Orphan listeners after soft-nav](../events/troubleshooting.md)
- Planning: [ELEMENTS.md](../../plans/ELEMENTS.md)
