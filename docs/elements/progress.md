---
seo_title: "Progress — Anza"
description: "ui-progress: determinate progress bar with a label slot, a percentage readout and progressbar ARIA values."
---

# Progress

Determinate progress bar with a label and a rounded percentage.

**Tag:** `ui-progress` · **Import:** `@anzaui/anza/elements/progress`

## Usage

```html
<ui-progress value="40" max="100">
  <span slot="label">Uploading</span>
</ui-progress>
```

```javascript
import '@anzaui/anza/elements/progress';

document.querySelector('ui-progress').value = 75;
```

## Attributes

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `value` | Number | `0` | Current value. |
| `max` | Number | `100` | Maximum value. `0` or missing falls back to `100`. |

The bar width and the readout show `round(value / max * 100)`, clamped to 0–100%.

## Slots

| Slot | Content |
| ---- | ------- |
| `label` | Label text. Defaults to "Progress". |

## Keyboard and accessibility

The host gets `role="progressbar"` unless you set a role. It also gets `aria-valuenow` (the raw `value`), `aria-valuemin="0"` and `aria-valuemax` (the effective `max`), updated on every change. Give it an `aria-label` if the visible label is not enough.

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `labels` | Row with the label slot and the percentage |
| `track` | The bar background |
| `fill` | The filled portion |

### Custom properties

| Property | Default |
| -------- | ------- |
| `--progress-bg` | `var(--color-border-default)` |
| `--progress-fill` | `var(--color-interactive)` |
| `--progress-track` | `var(--space-2)` (track height) |
| `--progress-radius` | `var(--radius-full)` |

## Related

- [Spinner](spinner.md)
- [Skeleton](skeleton.md)
- [Elements](index.md#feedback)
