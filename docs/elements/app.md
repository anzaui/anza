# App

Application shell with header, optional sidebar, and main content slots.

**Tag:** `ui-app` · **Import:** `@adukiorg/anza/elements/app`

---

## Import

```javascript
import '@adukiorg/anza/elements/app';
```

---

## Basic usage

```html
<ui-app>
  <ui-header slot="header">
    <span slot="brand">Acme</span>
  </ui-header>
  <ui-sidebar slot="sidebar">
    <a href="/">Home</a>
  </ui-sidebar>
  <p>Main content</p>
</ui-app>
```

---

## Props

_None — composition via slots._

## Slots / parts

| Name | Kind | Description |
| ---- | ---- | ----------- |
| `header` | slot | Top header region |
| `sidebar` | slot | Side navigation |
| _(default)_ | slot | Main content (`part="main"`) |
| `frame` | part | Header + sidebar + main frame |

---

## Related

- [Elements overview](index.md)
- [Layout](layout.md)
- [Header](header.md)
- [Sidebar](sidebar.md)
- Planning: [ELEMENTS.md](../../plans/ELEMENTS.md)
