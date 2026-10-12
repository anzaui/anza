---
seo_title: "Drawer — Anza"
description: "ui-drawer: modal side panel on the native dialog that slides in from the left or right. Open with the open attribute or show()."
---

# Drawer

Modal side panel on a native `<dialog>` that slides in from the left or right edge.

**Tag:** `ui-drawer` · **Import:** `@anzaui/anza/elements/drawer`

## Usage

```html
<ui-button id="open-nav" type="button">Menu</ui-button>

<ui-drawer id="nav" placement="left">
  <h2>Navigate</h2>
  <a href="/docs">Docs</a>
</ui-drawer>
```

```javascript
import '@anzaui/anza/elements/drawer';

const drawer = document.querySelector('#nav');
document.querySelector('#open-nav').addEventListener('click', () => drawer.show());
drawer.addEventListener('close', () => console.log('closed'));
```

## Attributes

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `open` | Boolean | `false` | Opens the drawer (`showModal()`) when set and closes it when removed. Closing waits 300ms for the slide-out before the native dialog closes. |
| `placement` | String | `right` | Edge to slide from: `left` or `right`. |

Set `placement` as an attribute. The slide styles match `[placement="left"]` and `[placement="right"]` on the host, and the `right` default is not written back to the attribute.

## Slots

| Slot | Content |
| ---- | ------- |
| (default) | Drawer body (column flex layout) |

## Events

| Event | Detail | When |
| ----- | ------ | ---- |
| `close` | none | The native dialog closed (after `hide()`, `open` removed, or Escape). Bubbles and is composed. |

## Methods

| Method | Returns | Description |
| ------ | ------- | ----------- |
| `show()` | `undefined` | Sets `open` to `true`. |
| `hide()` | `undefined` | Sets `open` to `false`. |

## Keyboard and accessibility

The native modal dialog traps focus and makes the page inert. Escape closes it at once (no slide-out) and clears `open`.

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `dialog` | The native `<dialog>` panel |

## Related

- [Overlay patterns](overlay.md)
- [Dialog](dialog.md)
- [Sheet](sheet.md)
