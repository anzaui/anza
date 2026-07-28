# Tooltip

Hover / focus hint. The tip stays in-tree (not a body portal) and uses the platform **escape / position** helper so it can leave `overflow` clipping via Popover top-layer, with a fixed-position fallback when APIs are missing.

**Tag:** `ui-tooltip` · **Import:** `@adukiorg/anza/elements/tooltip`

Architecture and when-to-use: [Overlay patterns](overlay.md).

---

## Import

```javascript
import '@adukiorg/anza/elements/tooltip';
```

---

## Basic usage

```html
<ui-tooltip>
  <ui-button type="button">Save</ui-button>
  <span slot="content">Save changes</span>
</ui-tooltip>
```

Optional placement (default `top`):

```html
<ui-tooltip placement="bottom">
  <ui-button type="button">Info</ui-button>
  <span slot="content">More detail</span>
</ui-tooltip>
```

---

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `placement` | String | Reflect | Anchor side: `top` (default), `bottom`, `left`, `right`, plus `-start` / `-end` variants |

## Slots / parts

| Name | Kind | Description |
| ---- | ---- | ----------- |
| (default) | slot | Trigger content |
| `content` | slot | Hint text / markup |
| `wrapper` | `::part` | Hover / focus target |
| `tooltip` | `::part` | Hint surface (`role="tooltip"`, `popover="manual"`) |

## Positioning / escape

- On pointer enter / focus-within, the tip opens via `showPopover()` when the Popover API (or polyfill) is available — top-layer, so typical `overflow: hidden` ancestors do not clip it.
- Placement is computed by `@adukiorg/anza/platform` (`escapeOverflow` / `guard.escape`) with `position: fixed` coordinates; scroll/resize keep it aligned.
- If popover methods are unavailable, the helper falls back to fixed positioning and a `data-escape-open` marker (still not a `document.body` portal).
- Prefer [popover](popover.md) / [menu](menu.md) for interactive panels; tooltip is for short non-interactive hints.

Platform API: `import { escapeOverflow, guard } from '@adukiorg/anza/platform'`.

### Lifecycle / memory

Show/hide uses the host `AbortController` (`el.ctrl.signal`) for the escape controller and pointer listeners. Soft-nav aborts teardown. See [Overlay patterns](overlay.md) and [Memory safety & framework globals](../ui/advanced.md).

---

## Related

- [Overlay patterns](overlay.md)
- [Popover](popover.md)
- [Elements overview](index.md)
- [Platform API](../platform/api.md) (`escapeOverflow` / `guard.escape`)
- [Guards → escape](../platform/guards.md#escape)
- Planning: [ELEMENTS.md](../../plans/ELEMENTS.md)
