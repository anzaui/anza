---
seo_title: "Skeleton — Anza"
description: "ui-skeleton: loading placeholder with block, text and circle shapes and a pulse that pauses under reduced motion."
---

# Skeleton

Loading placeholder with a pulsing opacity animation.

**Tag:** `ui-skeleton` · **Import:** `@anzaui/anza/elements/skeleton`

## Usage

```html
<ui-skeleton variant="circle"></ui-skeleton>
<ui-skeleton variant="text"></ui-skeleton>
<ui-skeleton width="200px" height="8"></ui-skeleton>
```

```javascript
import '@anzaui/anza/elements/skeleton';
```

## Attributes

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `variant` | String | none | `circle` (round, `--space-12` square, inline-block) or `text` (75% wide, `--space-3` high). Without it: a full-width block, `--space-4` high. |
| `width` | String | none | Sets `--skeleton-width`. A value containing `px`, `%` or `rem` is used as-is; any other value `n` becomes `var(--space-n)`. |
| `height` | String | none | Sets `--skeleton-height`, with the same rule as `width`. |

`width` and `height` are written as inline custom properties on the host, so they override the variant sizes.

## Keyboard and accessibility

The host gets `aria-hidden="true"` unless you set `aria-hidden`. Mark the loading region with `aria-busy="true"` yourself. The pulse uses the Web Animations API and pauses while `prefers-reduced-motion: reduce` matches.

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `shimmer` | The animated placeholder block |

### Custom properties

| Property | Default |
| -------- | ------- |
| `--skeleton-bg` | `var(--color-interactive-disabled)` |
| `--skeleton-radius` | `var(--radius-md)` |
| `--skeleton-width` | `100%` |
| `--skeleton-height` | `var(--space-4)` |

## Related

- [Spinner](spinner.md)
- [Progress](progress.md)
- [Elements](index.md#feedback)
