# Text

Typography primitive that maps size, weight, color, and family to design tokens, with optional semantic tag swapping.

**Tag:** `ui-text` · **Import:** `@adukiorg/anza/elements/text`

---

## Import

```javascript
import '@adukiorg/anza/elements/text';
```

---

## Basic usage

```html
<ui-text size="lg" weight="semibold">Headline</ui-text>
<ui-text as="p" color="muted" block>Supporting copy.</ui-text>
```

---

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `as` | String | Reflect, default `span` | Inner semantic tag (`span`, `p`, `h2`, …) |
| `size` | String | Reflect | Maps to `var(--font-size-{size})` |
| `weight` | String | Reflect | Maps to `var(--font-weight-{weight})` |
| `color` | String | Reflect | Maps to `var(--color-content-{color})` |
| `family` | String | Reflect | Maps to `var(--font-family-{family})` |
| `block` | Boolean | Reflect | Block display when set |

## Notes

Default slot content is projected into the dynamic root (`part="text"`).

---

## Related

- [Elements overview](index.md)
- [Primitives](primitives.md)
- [Tokens](../styles/tokens.md)
- [Planning: ELEMENTS.md](../../plans/ELEMENTS.md)
