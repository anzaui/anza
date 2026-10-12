---
seo_title: "Alert — Anza"
description: "ui-alert — inline severity notification with optional dismiss."
---

# Alert

Inline severity notification with `role="alert"` and optional dismiss control.

**Tag:** `ui-alert` · **Import:** `@anzaui/anza/elements/alert`

## Import

```javascript
import '@anzaui/anza/elements/alert';
```

## Basic usage

```html
<ui-alert variant="success">Saved successfully.</ui-alert>
<ui-alert variant="error" dismissible>Something went wrong.</ui-alert>
```

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `variant` | String | Reflect | Visual severity (e.g. info / success / warning / error — theme-dependent) |
| `dismissible` | Boolean | Reflect | Shows the close control when set |

## Events

| Event | When |
| ----- | ---- |
| `dismiss` | Fired when the close button is clicked; element then removes itself |

## Notes

Default slot is the alert body. Close button uses `part="close-button"`.

## Related

- [Elements overview](index.md)
- [Form association](../ui/form-associated.md) (when `form: true`)
