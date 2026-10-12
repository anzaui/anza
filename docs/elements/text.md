---
seo_title: "Text — Anza"
description: "ui-text — typography element: pick the rendered tag with as, and size, weight, color and family from design tokens."
---

# Text

Renders text in a chosen tag with size, weight, colour and family taken from design tokens.

**Tag:** `ui-text` · **Import:** `@anzaui/anza/elements/text`

## Usage

```javascript
import '@anzaui/anza/elements/text';
```

```html
<ui-text as="h2" size="2xl" weight="semibold" block>Settings</ui-text>
<ui-text color="muted">Last saved 2 minutes ago</ui-text>
```

## Attributes

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `as` | String | `span` | Tag rendered inside the shadow root. Allowed: `span`, `p`, `div`, `label`, `small`, `strong`, `em`, `b`, `i`, `u`, `s`, `mark`, `code`, `kbd`, `samp`, `var`, `abbr`, `cite`, `q`, `blockquote`, `pre`, `time`, `sub`, `sup`, `del`, `ins`, `h1`–`h6`, `figcaption`, `legend`. Matching is case-insensitive. Any other value renders a `<span>`. |
| `size` | String | — | Font-size token suffix: `lg` → `var(--font-size-lg)`. The shipped tokens define `base`, `lg`, `xl`, `2xl` and `3xl`. |
| `weight` | String | — | Font-weight token suffix: `semibold` → `var(--font-weight-semibold)`. The shipped tokens define `regular`, `medium` and `semibold`. |
| `color` | String | — | Content colour token suffix: `secondary` → `var(--color-content-secondary)`. The shipped tokens define `primary`, `secondary` and `link`. `muted` is an alias for `secondary`. |
| `family` | String | — | Font-family token suffix: `mono` → `var(--font-family-mono)`. The shipped tokens define no `--font-family-*` variables, so define the ones you use. |
| `block` | Boolean | `false` | Displays the host as `block` instead of `inline`. |

## Slots

| Slot | Content |
| ---- | ------- |
| default | The text |

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `text` | The rendered tag (the one chosen by `as`) |

### Custom properties

| Property | Default |
| -------- | ------- |
| `--text-size` | `var(--font-size-base)` |
| `--text-weight` | `var(--font-weight-regular)` |
| `--text-family` | `var(--font-sans)` |
| `--text-height` | `var(--line-height-normal)` |
| `--text-color` | `var(--color-content-primary)` |

The `size`, `weight`, `color` and `family` attributes set these properties inline on the host, so they win over stylesheet values.

## Related

- [Elements](index.md#primitives)
- [Design Tokens](../styles/tokens.md)
