# Breadcrumb

Accessible breadcrumb trail (`nav` + ordered list). Dividers between items come from CSS.

**Tag:** `ui-breadcrumb` · **Import:** `@adukiorg/anza/elements/breadcrumb`

---

## Import

```javascript
import '@adukiorg/anza/elements/breadcrumb';
```

---

## Basic usage

```html
<ui-breadcrumb>
  <li><a href="/docs">Docs</a></li>
  <li><a href="/docs/elements/index">Elements</a></li>
  <li aria-current="page">Breadcrumb</li>
</ui-breadcrumb>
```

---

## Props

_None — slot list items; style via CSS / parts._

## Notes

Uses `aria-label="Breadcrumb"`. Parts: `nav`, `list`. Slot children into the ordered list (typically `<li>`).

---

## Related

- [Elements overview](index.md)
- [Navigation](navigation.md)
- [Nav](nav.md)
- Planning: [ELEMENTS.md](../../plans/ELEMENTS.md)
