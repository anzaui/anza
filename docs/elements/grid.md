# Grid

Responsive CSS grid with column template and gap.

**Tag:** `ui-grid` · **Import:** `@anzaui/anza/elements/grid`

---

## Import

```javascript
import '@anzaui/anza/elements/grid';
```

---

## Basic usage

```html
<ui-grid cols="3" gap="4">
  <div>A</div><div>B</div><div>C</div>
</ui-grid>
<ui-grid cols="1fr 2fr" gap="1rem">
  <div>Narrow</div>
  <div>Wide</div>
</ui-grid>
```

---

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `cols` | String | Reflect | Numeric → `repeat(N, minmax(0, 1fr))`; otherwise raw CSS track list |
| `gap` | String | Reflect | Sets `--grid-gap` (length/`rem`, or space token name) |

## Notes

Default slot / `part="grid"`.

---

## Related

- [Elements overview](index.md)
- [Layout](layout.md)
- [Stack](stack.md)
- [Split](split.md)
- Planning: [ELEMENTS.md](../../plans/ELEMENTS.md)
