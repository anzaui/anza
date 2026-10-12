---
seo_title: "Popover — Anza"
description: "ui-popover: light-dismiss panel on the native Popover API, with show(), hide(), toggle() and a toggle event. Polyfilled where missing."
---

# Popover

Light-dismiss panel built on the native Popover API (`popover="auto"`), rendered in the top layer.

**Tag:** `ui-popover` · **Import:** `@anzaui/anza/elements/popover`

## Usage

```html
<ui-button id="more" type="button">More</ui-button>
<ui-popover id="panel">
  <p>Contextual content</p>
</ui-popover>
```

```javascript
import '@anzaui/anza/elements/popover';

const panel = document.querySelector('#panel');
document.querySelector('#more').addEventListener('click', () => panel.toggle());
panel.addEventListener('toggle', (e) => console.log(e.detail.newState));
```

The element does not position the panel next to a trigger. Place it with CSS on `ui-popover::part(popover)`.

Where the browser lacks the Popover API, the element loads the platform polyfill. See [Overlay patterns](overlay.md#popover-polyfill).

## Slots

| Slot | Content |
| ---- | ------- |
| (default) | Panel content |

## Events

| Event | Detail | When |
| ----- | ------ | ---- |
| `toggle` | `{ newState: 'open' \| 'closed' }` | The panel opened or closed, by a method call or by light dismiss. Bubbles and is composed. |

## Methods

| Method | Returns | Description |
| ------ | ------- | ----------- |
| `show()` | `undefined` | Opens the panel if it is closed. |
| `hide()` | `undefined` | Closes the panel if it is open. |
| `toggle()` | `undefined` | Opens or closes the panel. |

## Keyboard and accessibility

With the native API, the `auto` popover closes on Escape and on a click outside it, and opening another `auto` popover closes it. The polyfill only closes it on a pointer press outside the panel. The element adds no ARIA role; give the content its own semantics.

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `popover` | The `[popover]` panel |

## Related

- [Overlay patterns](overlay.md)
- [Menu](menu.md)
- [Tooltip](tooltip.md)
- [Guards](../platform/guards.md#popover)
