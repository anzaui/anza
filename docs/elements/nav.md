# Nav

Accessible navigation wrapper with horizontal or vertical orientation.

**Tag:** `ui-nav` · **Import:** `@adukiorg/anza/elements/nav`

---

## Import

```javascript
import '@adukiorg/anza/elements/nav';
```

---

## Basic usage

```html
<ui-nav>
  <a href="/docs">Docs</a>
  <a href="/docs/elements/index">Elements</a>
</ui-nav>
<ui-nav orientation="vertical">
  <a href="/a">Section A</a>
  <a href="/b">Section B</a>
</ui-nav>
```

---

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `orientation` | String | Reflect | `horizontal` (default) or `vertical` |

## Notes

Defaults `role="navigation"`. Inner markup uses `part="nav"`; put links / list items in the default slot.

---

## Related

- [Elements overview](index.md)
- [Navigation](navigation.md)
- [Breadcrumb](breadcrumb.md)
- [Link](link.md)
- Planning: [ELEMENTS.md](../../plans/ELEMENTS.md)
