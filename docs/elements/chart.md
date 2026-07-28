# Chart

Lightweight canvas chart (`bar` or `line`) with high-DPI scaling and resize redraw.

**Tag:** `ui-chart` · **Import:** `@adukiorg/anza/elements/chart`

---

## Import

```javascript
import '@adukiorg/anza/elements/chart';
```

---

## Basic usage

```html
<ui-chart type="bar" data="[10, 30, 20, 50, 40, 60]"></ui-chart>
<ui-chart type="line" data="[5, 12, 9, 18, 14]"></ui-chart>
```

---

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `type` | String | Reflect | Chart kind: `bar` (default) or `line` |
| `data` | String | Reflect | JSON array of numbers (invalid / missing → sample series) |

## Notes

Draws with CSS tokens `--color-interactive`, `--color-border-default`, `--color-content-secondary` when present. A `ResizeObserver` on the canvas redraws on size changes and disconnects on `el.ctrl.signal` abort.

### Lifecycle / memory

`ResizeObserver` is tied to the component abort signal — soft-nav disconnect cleans it up. Prefer prop updates (`data` / `type`) over attaching your own observers from a leaf without a signal.

---

## Related

- [Elements overview](index.md)
- [Data](data.md)
- [Stat](stat.md)
- [Memory safety & framework globals](../ui/advanced.md)
- Planning: [ELEMENTS.md](../../plans/ELEMENTS.md)
