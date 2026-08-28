# Divider

Separating line with orientation and spacing token integration.

**Tag:** `ui-divider` · **Import:** `@anzaui/anza/elements/divider`

## Import

```javascript
import '@anzaui/anza/elements/divider';
```

## Basic usage

```html
<ui-divider></ui-divider>
<ui-divider orientation="vertical" spacing="4"></ui-divider>
```

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `orientation` | String | Reflect, default `horizontal` | `horizontal` | `vertical` |
| `spacing` | String | Reflect | CSS length or space token key applied as `--divider-space` |

## Notes

Defaults `role="separator"` when unset.

## Related

- [Elements overview](index.md)
- [Primitives](primitives.md)
- [Planning: ELEMENTS.md](../../plans/ELEMENTS.md)
