---
seo_title: "Dialog — Anza"
description: "ui-dialog: modal overlay around the native dialog element. Open it with the open attribute or showModal(), close it with close(returnValue)."
---

# Dialog

Modal overlay that wraps a native `<dialog>`, so the browser provides the top layer, backdrop, focus trap and Escape handling.

**Tag:** `ui-dialog` · **Import:** `@anzaui/anza/elements/dialog`

## Usage

```html
<ui-button id="delete" type="button">Delete</ui-button>

<ui-dialog id="confirm">
  <h2>Delete this item?</h2>
  <ui-button id="cancel" type="button">Cancel</ui-button>
  <ui-button id="ok" type="button">Delete</ui-button>
</ui-dialog>
```

```javascript
import '@anzaui/anza/elements/dialog';

const dialog = document.querySelector('#confirm');
document.querySelector('#delete').addEventListener('click', () => dialog.showModal());
document.querySelector('#cancel').addEventListener('click', () => dialog.close('cancel'));
document.querySelector('#ok').addEventListener('click', () => dialog.close('ok'));
dialog.addEventListener('close', (e) => console.log(e.detail.returnValue));
```

`showModal()` before the element has mounted sets `open`, and the dialog opens as soon as it mounts. Markup can open it too: `<ui-dialog open>` opens as a modal when it connects.

## Attributes

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `open` | Boolean | `false` | Open state. Setting the attribute or property opens the native dialog as a modal; removing it (or `false`) closes it. `showModal()` sets it, and `close()` or a native close (Escape) clears it. |

## Slots

| Slot | Content |
| ---- | ------- |
| (default) | Dialog body. It sits in a column flex wrapper with a `--space-4` gap. |

## Events

| Event | Detail | When |
| ----- | ------ | ---- |
| `show` | none | The dialog opened (`showModal()`, or `open` set). |
| `close` | `{ returnValue: string }` | The native dialog closed: `close()`, `open` removed, or Escape. |
| `cancel` | none | The user pressed Escape. Cancelable: `preventDefault()` keeps the dialog open. |

All three bubble and are composed.

## Methods

| Method | Returns | Description |
| ------ | ------- | ----------- |
| `showModal()` | `undefined` | Sets `open`. Once mounted, opens the native dialog as a modal right away (if not already open) and fires `show`. |
| `close(returnValue = '')` | `undefined` | Closes the native dialog with `returnValue` (if open) and clears `open`. `close` fires when the native dialog closes. |

## Keyboard and accessibility

The native `<dialog>` handles focus: `showModal()` moves focus into the dialog, traps it there and makes the rest of the page inert. Escape fires `cancel`, then closes the dialog unless you prevented `cancel`. Give the dialog a heading so it has a visible title.

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `dialog` | The native `<dialog>` surface |

The backdrop is the native `dialog::backdrop`, styled inside the shadow root.

## Related

- [Overlay patterns](overlay.md)
- [Drawer](drawer.md)
- [Sheet](sheet.md)
- [Elements](index.md)
