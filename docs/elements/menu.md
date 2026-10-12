---
seo_title: "Menu — Anza"
description: "ui-menu: role=menu panel on the Popover API with arrow-key navigation, roving tabindex, and show(), hide(), toggle()."
---

# Menu

Action menu on the Popover API (`popover="auto"`, `role="menu"`), with arrow-key navigation and a roving `tabindex`.

**Tag:** `ui-menu` · **Import:** `@anzaui/anza/elements/menu`

## Usage

```html
<ui-button id="actions" type="button">Actions</ui-button>
<ui-menu id="menu">
  <ui-button type="button">Edit</ui-button>
  <ui-button type="button">Duplicate</ui-button>
  <ui-button type="button">Delete</ui-button>
</ui-menu>
```

```javascript
import '@anzaui/anza/elements/menu';

const menu = document.querySelector('#menu');
document.querySelector('#actions').addEventListener('click', () => menu.toggle());
```

The menu does not close when an item is clicked; call `hide()` in your item handler. It also does not position the panel next to the trigger; place it with CSS on `ui-menu::part(menu)`.

Where the browser lacks the Popover API, the element loads the platform polyfill. See [Overlay patterns](overlay.md#popover-polyfill).

## Slots

| Slot | Content |
| ---- | ------- |
| (default) | Menu items. Direct children that are `ui-button`, `button` or `[role="menuitem"]` count as items. |

When the slot content changes, each item without a `role` gets `role="menuitem"`. The first item gets `tabindex="0"` and the others `tabindex="-1"`.

## Methods

| Method | Returns | Description |
| ------ | ------- | ----------- |
| `show()` | `undefined` | Opens the panel if it is closed and focuses the first item. |
| `hide()` | `undefined` | Closes the panel if it is open. |
| `toggle()` | `undefined` | Calls `show()` or `hide()`. |

The menu fires no events of its own.

## Keyboard and accessibility

Keys are handled on the panel:

| Key | Action |
| --- | ------ |
| ArrowDown | Focus the next item (wraps to the first) |
| ArrowUp | Focus the previous item (wraps to the last) |
| Home | Focus the first item |
| End | Focus the last item |
| Escape | Close the menu |

The focused item gets `tabindex="0"`. The element stores its index in `data-focused-index` on the host. With the native API, a click outside also closes the menu (light dismiss); the polyfill closes it on a pointer press outside.

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `menu` | The `[popover]` panel (`role="menu"`) |

Slotted `ui-button`, `button` and `div[role="menuitem"]` children get full-width row styling from the element.

## Related

- [Overlay patterns](overlay.md)
- [Popover](popover.md)
- [Button](button.md)
