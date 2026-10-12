---
seo_title: "Avatar — Anza"
description: "ui-avatar — profile image that falls back to initials from the name, with a size attribute and an automatic aria-label."
---

# Avatar

A round profile image that shows initials when there is no image or it fails to load.

**Tag:** `ui-avatar` · **Import:** `@anzaui/anza/elements/avatar`

## Usage

```javascript
import '@anzaui/anza/elements/avatar';
```

```html
<ui-avatar src="/img/ada.jpg" name="Ada Lovelace" size="10"></ui-avatar>
```

## Attributes

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `src` | String | — | Image URL. The image shows on `load`; on `error` the initials show instead. |
| `name` | String | — | Full name. The initials are the first letters of the first and last words, uppercased. |
| `size` | String | — | A spacing step (`10` → `var(--space-10)`) or a length containing `px` or `rem`. Without it the avatar is `--avatar-size`. |

## Keyboard and accessibility

When the host has no `aria-label` and `name` is set, the avatar sets `aria-label="Avatar of <name>"`. It also adds `role="img"` when the host has no `role`.

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `image` | The `<img>` |
| `initials` | The `<span>` with the initials |

### Custom properties

| Property | Default |
| -------- | ------- |
| `--avatar-size` | `var(--space-8)` |

The font size is 40% of the avatar size.

## Related

- [Elements](index.md#primitives)
- [Badge](badge.md)
