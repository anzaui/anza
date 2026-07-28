# Surface

Styled surface for flat, elevated, or bordered panels.

**Tag:** `ui-surface` · **Import:** `@adukiorg/anza/elements/surface`

---

## Import

```javascript
import '@adukiorg/anza/elements/surface';
```

---

## Basic usage

```html
<ui-surface>Flat content</ui-surface>
<ui-surface variant="elevated">Elevated panel</ui-surface>
<ui-surface variant="bordered">Bordered panel</ui-surface>
```

---

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `variant` | String | Reflect | Surface treatment (default `flat`; theme may define `elevated`, `bordered`, …) |

## Notes

Default slot / `part="surface"`.

---

## Related

- [Elements overview](index.md)
- [Layout](layout.md)
- [Card](card.md)
- Planning: [ELEMENTS.md](../../plans/ELEMENTS.md)
