---
seo_title: "Sheet — Anza"
description: "ui-sheet: modal bottom sheet on the native dialog with a drag handle to dismiss. Open with the open attribute or show()."
---

# Sheet

Modal bottom sheet on a native `<dialog>`. Drag the handle down to dismiss it.

**Tag:** `ui-sheet` · **Import:** `@anzaui/anza/elements/sheet`

## Usage

```html
<ui-button id="open-filters" type="button">Filters</ui-button>

<ui-sheet id="filters">
  <h2>Filters</h2>
  <p>Sheet content</p>
</ui-sheet>
```

```javascript
import '@anzaui/anza/elements/sheet';

const sheet = document.querySelector('#filters');
document.querySelector('#open-filters').addEventListener('click', () => sheet.show());
```

## Attributes

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `open` | Boolean | `false` | Opens the sheet (`showModal()`) when set and closes it when removed. Closing waits 300ms for the slide-down before the native dialog closes. |

## Slots

| Slot | Content |
| ---- | ------- |
| (default) | Sheet content, in a scrollable area below the handle |

## Events

| Event | Detail | When |
| ----- | ------ | ---- |
| `close` | none | The native dialog closed (after `hide()`, `open` removed, a drag dismiss, or Escape). Bubbles and is composed. |

## Methods

| Method | Returns | Description |
| ------ | ------- | ----------- |
| `show()` | `undefined` | Sets `open` to `true`. |
| `hide()` | `undefined` | Sets `open` to `false`. |

## Keyboard and accessibility

The native modal dialog traps focus and makes the page inert. Escape closes it at once and clears `open`.

Drag: press on the handle and move down; the sheet follows the pointer (upward moves are ignored). Releasing after more than 120px closes the sheet; a shorter drag snaps it back. The drag has no keyboard equivalent, so keep a close button in the content.

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `dialog` | The native `<dialog>` panel |
| `handle` | The drag handle bar |
| `content` | Scrollable wrapper around the default slot |

## Related

- [Overlay patterns](overlay.md)
- [Dialog](dialog.md)
- [Drawer](drawer.md)
