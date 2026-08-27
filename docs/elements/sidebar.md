# Sidebar

Collapsible side panel for navigation or secondary chrome.

**Tag:** `ui-sidebar` · **Import:** `@anzaui/anza/elements/sidebar`

---

## Import

```javascript
import '@anzaui/anza/elements/sidebar';
```

---

## Basic usage

```html
<ui-sidebar>
  <a href="/docs">Docs</a>
  <a href="/docs/elements/index">Elements</a>
</ui-sidebar>
<ui-sidebar collapsed></ui-sidebar>
```

```javascript
document.querySelector('ui-sidebar').toggle();
```

---

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `collapsed` | Boolean | Reflect | Collapsed layout when set |

## Methods

| Method | Description |
| ------ | ----------- |
| `toggle()` | Flips `collapsed` |

## Notes

Default slot content sits in `part="wrapper"`.

---

## Related

- [Elements overview](index.md)
- [Layout](layout.md)
- [App](app.md)
- [Nav](nav.md)
- Planning: [ELEMENTS.md](../../plans/ELEMENTS.md)
