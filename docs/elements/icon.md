# Icon

Accessible SVG sprite icon with size tokens, name/href targets, and ARIA decoration.

**Tag:** `ui-icon` · **Import:** `@adukiorg/anza/elements/icon`

---

## Import

```javascript
import '@adukiorg/anza/elements/icon';
```

---

## Basic usage

```html
<ui-icon name="check" size="4"></ui-icon>
<ui-icon href="/assets/icons.svg#icon-search" aria-label="Search"></ui-icon>
```

---

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `name` | String | Reflect | Sprite id; resolves to `/assets/icons.svg#icon-{name}` when `href` is unset |
| `href` | String | Reflect | Full `<use href>` target (overrides `name`) |
| `size` | String | Reflect | CSS length or space token key (e.g. `4` → `var(--space-4)`) |
| `stroke` | String | Reflect | Stroke color via `--icon-stroke` |

## Notes

Without `aria-label` / `aria-labelledby`, the SVG is `aria-hidden`. Provide a label when the icon is meaningful.

---

## Related

- [Elements overview](index.md)
- [Primitives](primitives.md)
- [Planning: ELEMENTS.md](../../plans/ELEMENTS.md)
