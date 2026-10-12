---
seo_title: "Badge — Anza"
description: "ui-badge — compact status label with info, success, warning and error variants and sm or lg sizes."
---

# Badge

A compact inline label for status or counts.

**Tag:** `ui-badge` · **Import:** `@anzaui/anza/elements/badge`

## Usage

```javascript
import '@anzaui/anza/elements/badge';
```

```html
<ui-badge variant="success">Active</ui-badge>
```

## Attributes

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `variant` | String | — | `info`, `success`, `warning` or `error`. Without it the badge uses the neutral elevated surface. |
| `size` | String | — | `sm` or `lg`. Without it the badge uses `--badge-size`. |

## Slots

| Slot | Content |
| ---- | ------- |
| default | The label |

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `badge` | The inner `<span>` |

### Custom properties

| Property | Default |
| -------- | ------- |
| `--badge-radius` | `var(--radius-full)` |
| `--badge-font` | `var(--font-sans)` |
| `--badge-weight` | `var(--font-weight-semibold)` |
| `--badge-size` | `var(--font-size-xs)` |
| `--badge-bg` | `var(--color-surface-elevated)` |
| `--badge-color` | `var(--color-content-secondary)` |
| `--badge-border` | `var(--color-border-default)` |
| `--badge-padding-y` | `var(--space-0-5)` |
| `--badge-padding-x` | `var(--space-2)` |

Each `variant` sets `--badge-bg` to its `--color-feedback-*` token, `--badge-color` to `var(--color-content-inverse)` and `--badge-border` to `transparent`. The `sm` and `lg` sizes set font size and padding directly, so `--badge-size` and the padding properties have no effect with them.

## Related

- [Elements](index.md#primitives)
- [Alert](alert.md)
