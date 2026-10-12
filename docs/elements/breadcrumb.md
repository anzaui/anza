---
seo_title: "Breadcrumb — Anza"
description: "ui-breadcrumb — accessible breadcrumb trail."
---

# Breadcrumb

Accessible breadcrumb trail (`nav` + ordered list). Dividers between items come from CSS.

**Tag:** `ui-breadcrumb` · **Import:** `@anzaui/anza/elements/breadcrumb`

## Import

```javascript
import '@anzaui/anza/elements/breadcrumb';
```

## Basic usage

```html
<ui-breadcrumb>
  <li><a href="/docs">Docs</a></li>
  <li><a href="/docs/elements">Elements</a></li>
  <li aria-current="page">Breadcrumb</li>
</ui-breadcrumb>
```

## Props

_None — slot list items; style via CSS / parts._

## Notes

Uses `aria-label="Breadcrumb"`. Parts: `nav`, `list`. Slot children into the ordered list (typically `<li>`).

## Related

- [Elements overview](index.md)
- [Navigation](index.md#navigation)
- [Nav](nav.md)
