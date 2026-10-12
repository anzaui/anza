---
seo_title: "Spinner — Anza"
description: "ui-spinner — indeterminate loading ring animated with the Web Animations API, paused under prefers-reduced-motion."
---

# Spinner

An indeterminate loading ring.

**Tag:** `ui-spinner` · **Import:** `@anzaui/anza/elements/spinner`

## Usage

```javascript
import '@anzaui/anza/elements/spinner';
```

```html
<ui-spinner aria-label="Loading results"></ui-spinner>
```

The spinner has no attributes. The ring turns once every 800 ms with the Web Animations API. The animation pauses while `prefers-reduced-motion: reduce` matches, and is cancelled on disconnect.

## Keyboard and accessibility

The spinner sets `role="progressbar"` unless the host has a `role`, and `aria-label="Loading"` unless it has `aria-label` or `aria-labelledby`.

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `ring` | The rotating ring |

### Custom properties

| Property | Default |
| -------- | ------- |
| `--spinner-size` | `var(--space-6)` |
| `--spinner-color` | `var(--color-interactive)` |
| `--spinner-width` | `var(--space-0-5)` |

## Related

- [Elements](index.md#primitives)
- [Progress](progress.md)
- [Skeleton](skeleton.md)
