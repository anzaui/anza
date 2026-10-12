---
seo_title: "Header — Anza"
description: "ui-header — top bar with a brand slot on the left and actions on the right."
---

# Header

A top bar with a brand area on the left and actions on the right.

**Tag:** `ui-header` · **Import:** `@anzaui/anza/elements/header`

## Usage

```javascript
import '@anzaui/anza/elements/header';
```

```html
<ui-header>
  <strong slot="brand">Acme</strong>
  <ui-button>Sign in</ui-button>
</ui-header>
```

The header has no attributes. It is `var(--space-16)` tall with a bottom border.

## Slots

| Slot | Content |
| ---- | ------- |
| `brand` | Logo or product name |
| default | Actions |

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `header` | The `<header>` |
| `brand` | The brand area |
| `actions` | The actions area |

## Related

- [Elements](index.md#layout)
- [App](app.md)
