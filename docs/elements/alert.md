---
seo_title: "Alert — Anza"
description: "ui-alert: inline notice with info, success, warning and error variants, role=alert, and an optional dismiss button."
---

# Alert

Inline notice with a severity variant and an optional dismiss button.

**Tag:** `ui-alert` · **Import:** `@anzaui/anza/elements/alert`

## Usage

```html
<ui-alert variant="warning" dismissible>
  Your trial ends in 3 days.
</ui-alert>
```

```javascript
import '@anzaui/anza/elements/alert';
```

## Attributes

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `variant` | String | none | Border color: `info`, `success`, `warning` or `error`. Without it the alert uses the default border on an elevated surface. |
| `dismissible` | Boolean | `false` | Shows the close button. |

## Slots

| Slot | Content |
| ---- | ------- |
| (default) | Message content |

## Events

| Event | Detail | When |
| ----- | ------ | ---- |
| `dismiss` | none | The close button was clicked. Bubbles and is composed. The alert then removes itself from the DOM. |

## Keyboard and accessibility

The inner container has `role="alert"`, so screen readers announce the content when the alert is inserted. Use it for messages that need attention; for passive status use plain text or a [Toast](toast.md). The close button is a native `<button>` labelled "Close alert".

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `alert` | The container (`role="alert"`) |
| `body` | Wrapper around the default slot |
| `close-button` | The dismiss button |

### Custom properties

| Property | Default |
| -------- | ------- |
| `--alert-radius` | `var(--radius-md)` |
| `--alert-bg` | `var(--color-surface-elevated)` |
| `--alert-color` | `var(--color-content-primary)` |
| `--alert-border` | `var(--color-border-default)` |

Each variant sets `--alert-bg` to `var(--color-surface-page)` and `--alert-border` to the matching `--color-feedback-*` token.

## Related

- [Toast](toast.md)
- [Empty](empty.md)
- [Elements](index.md#feedback)
