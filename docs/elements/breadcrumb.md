---
seo_title: "Breadcrumb — Anza"
description: "ui-breadcrumb — breadcrumb trail in a labelled nav, with slash separators and the last item shown as current."
---

# Breadcrumb

A breadcrumb trail with a separator between items.

**Tag:** `ui-breadcrumb` · **Import:** `@anzaui/anza/elements/breadcrumb`

## Usage

```javascript
import '@anzaui/anza/elements/breadcrumb';
import '@anzaui/anza/elements/link';
```

```html
<ui-breadcrumb>
  <ui-link href="/">Home</ui-link>
  <ui-link href="/docs">Docs</ui-link>
  <span>Breadcrumb</span>
</ui-breadcrumb>
```

The breadcrumb has no attributes. Every item except the last gets a `/` after it. The last item is shown in the primary content colour and does not take clicks (`pointer-events: none`).

## Slots

| Slot | Content |
| ---- | ------- |
| default | The items: `ui-link`, `a` or `span` elements |

## Keyboard and accessibility

The items sit inside `<nav aria-label="Breadcrumb">` and an `<ol>`. The breadcrumb does not set `aria-current`; set it on the last item yourself.

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `nav` | The `<nav>` |
| `list` | The `<ol>` |

## Related

- [Elements](index.md#navigation)
- [Link](link.md)
