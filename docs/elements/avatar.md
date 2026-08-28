# Avatar

Profile picture with image or initials fallback, sized via tokens and labeled for accessibility.

**Tag:** `ui-avatar` · **Import:** `@anzaui/anza/elements/avatar`

## Import

```javascript
import '@anzaui/anza/elements/avatar';
```

## Basic usage

```html
<ui-avatar name="Ada Lovelace" src="/avatars/ada.jpg"></ui-avatar>
<ui-avatar name="Grace Hopper" size="10"></ui-avatar>
```

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `src` | String | Reflect | Image URL; falls back to initials on error or when unset |
| `name` | String | Reflect | Display name used for initials and default `aria-label` |
| `size` | String | Reflect | CSS length or space token key |

## Notes

Sets `aria-label="Avatar of {name}"` when `name` is present and no label is set. Initials come from the first and last word of `name`.

## Related

- [Elements overview](index.md)
- [Primitives](primitives.md)
- [Planning: ELEMENTS.md](../../plans/ELEMENTS.md)
