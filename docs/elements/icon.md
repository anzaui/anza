---
seo_title: "Icon — Anza"
description: "ui-icon — SVG sprite icon with name or href, size and stroke attributes, hidden from assistive tech unless labelled."
---

# Icon

Renders one symbol from an SVG sprite through `<use>`.

**Tag:** `ui-icon` · **Import:** `@anzaui/anza/elements/icon`

## Usage

```javascript
import '@anzaui/anza/elements/icon';
```

```html
<ui-icon name="search" size="5"></ui-icon>
<ui-icon href="/assets/brand.svg#logo" aria-label="Anza"></ui-icon>
```

## Attributes

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `name` | String | — | Sprite symbol. Resolves to `/assets/icons.svg#icon-<name>`. |
| `href` | String | — | Full sprite reference. Takes precedence over `name`. |
| `size` | String | — | A spacing step (`5` → `var(--space-5)`) or a length containing `px` or `rem`. Sets `--icon-size`. |
| `stroke` | String | — | Stroke width. Sets `--icon-stroke`. |

## Keyboard and accessibility

The inner `<svg>` has `aria-hidden="true"` unless the host has `aria-label` or `aria-labelledby`.

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `svg` | The `<svg>` |

### Custom properties

| Property | Default |
| -------- | ------- |
| `--icon-size` | `var(--space-4)` |
| `--icon-color` | `currentColor` |
| `--icon-stroke` | `2` |

The `size` and `stroke` attributes set `--icon-size` and `--icon-stroke` inline on the host, so they win over stylesheet values.

## Related

- [Elements](index.md#primitives)
- [Button](button.md)
- [Design Tokens](../styles/tokens.md)
