---
seo_title: "Toast — Anza"
description: "ui-toast: temporary status message that removes itself after a delay. showToast() stacks toasts in a fixed corner container."
---

# Toast

Temporary status message that removes itself after `duration` milliseconds.

**Tag:** `ui-toast` · **Import:** `@anzaui/anza/elements/toast`

## Usage

Call `showToast()`:

```javascript
import { showToast } from '@anzaui/anza/elements';

showToast('Settings saved', { duration: 5000 });
```

`@anzaui/anza/elements` registers every element. To load only the toast, import the same helper as `show`:

```javascript
import { show } from '@anzaui/anza/elements/toast';

show('Settings saved');
```

You can also place the tag yourself. It dismisses itself the same way, but stays where you put it:

```html
<ui-toast duration="4000">Upload complete</ui-toast>
```

## `showToast(message, options)`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `message` | string | Toast text. Set as `textContent`, so HTML is not parsed. |
| `options.duration` | number | Milliseconds before the toast dismisses. Omitted or `0` means 3000. |

Returns the new `ui-toast` element, or `undefined` when there is no `window`. The first call appends one shared container to `document.body`: fixed, bottom-right, `z-index: 9999`, stacked in a column. Later toasts go into the same container. It is not a dialog or popover.

## Attributes

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `duration` | Number | `3000` | Milliseconds from mount until dismiss. Read once at mount; later changes have no effect. |

On dismiss the toast fades out and is removed from the DOM 250ms later. It fires no events. If it disconnects first, the timer is cleared.

## Slots

| Slot | Content |
| ---- | ------- |
| (default) | Message content |

## Keyboard and accessibility

The surface has `role="status"`, a polite live region. The toast takes no focus and has no close button, so do not put actions in it that the user must reach before it disappears.

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `toast` | The toast surface (`role="status"`) |

## Related

- [Alert](alert.md)
- [Overlay patterns](overlay.md)
- [Elements](index.md#feedback)
