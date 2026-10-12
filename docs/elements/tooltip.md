---
seo_title: "Tooltip — Anza"
description: "ui-tooltip: hover and focus hint that escapes overflow clipping through the top layer, with 12 placements."
---

# Tooltip

Short hint shown on hover or focus. The tip stays in the shadow tree and uses `guard.escape` to leave `overflow: hidden` ancestors.

**Tag:** `ui-tooltip` · **Import:** `@anzaui/anza/elements/tooltip`

## Usage

```html
<ui-tooltip placement="bottom">
  <ui-button type="button">Save</ui-button>
  <span slot="content">Save changes</span>
</ui-tooltip>
```

```javascript
import '@anzaui/anza/elements/tooltip';
```

## Attributes

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `placement` | String | `top` | Side and alignment: `top`, `top-start`, `top-end`, `bottom`, `bottom-start`, `bottom-end`, `left`, `left-start`, `left-end`, `right`, `right-start`, `right-end`. An unknown value places the tip below the trigger, aligned to its start. |

The tip is offset 8px from the trigger and clamped to the viewport. It does not flip to the other side. A changed `placement` applies the next time the tip opens.

## Slots

| Slot | Content |
| ---- | ------- |
| (default) | The trigger |
| `content` | The hint text |

## Keyboard and accessibility

The tip opens when the pointer enters the trigger area or focus moves into it. It closes when the pointer leaves, or when focus leaves both the trigger and the tip. The tip has `role="tooltip"`. The element does not set `aria-describedby` on the trigger; add an accessible name or description to the trigger yourself if the hint carries meaning.

## How it escapes clipping

The tip is a `popover="manual"` element. On first show the element calls `guard.escape(tip, wrapper, { placement, offset: 8, signal })`, which loads the Popover polyfill if needed, then shows the tip in the top layer and positions it with fixed coordinates. If `showPopover()` fails, it falls back to `position: fixed` and sets `data-escape-open`. Scroll and resize listeners exist only while the tip is open. The controller is released when the element disconnects. See [Overlay patterns](overlay.md#custom-floats).

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `wrapper` | Wrapper around the trigger and the tip; the hover and focus target |
| `tooltip` | The tip surface (`role="tooltip"`, `popover="manual"`) |

## Related

- [Overlay patterns](overlay.md)
- [Popover](popover.md)
- [Guards](../platform/guards.md#escape)
