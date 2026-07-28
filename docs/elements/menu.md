# Menu

Keyboard-accessible menu built on the Popover API with roving tabindex (arrows, Home, End, Escape).

**Tag:** `ui-menu` · **Import:** `@adukiorg/anza/elements/menu`

Architecture and when-to-use: [Overlay patterns](overlay.md).

---

## Import

```javascript
import '@adukiorg/anza/elements/menu';
```

---

## Basic usage

```html
<ui-button id="actions" type="button">Actions</ui-button>
<ui-menu id="menu">
  <ui-button type="button">Edit</ui-button>
  <ui-button type="button">Duplicate</ui-button>
  <ui-button type="button">Delete</ui-button>
</ui-menu>

<script type="module">
  const menu = document.querySelector('#menu');
  document.querySelector('#actions').addEventListener('click', () => menu.toggle());
</script>
```

---

## Props

None. Open state is driven by methods.

## Methods

| Method | Description |
| ------ | ----------- |
| `show()` | Opens the menu and focuses the first item |
| `hide()` | Closes the menu |
| `toggle()` | Toggles open / closed |

## Notes

Slotted `ui-button` / `button` / `[role=menuitem]` get `role="menuitem"` and roving `tabindex`. Surface is `part="menu"` with `[popover="auto"]`.

### Lifecycle / memory

Key handlers bind on the popover surface via component `on`. Soft-nav aborts the leaf `ctrl`. See [Overlay patterns](overlay.md) and [Memory safety & framework globals](../ui/advanced.md).

---

## Related

- [Overlay patterns](overlay.md)
- [Popover](popover.md)
- [Elements overview](index.md)
- [Platform API](../platform/api.md) (`guard.popover`)
- [Guards](../platform/guards.md)
- Planning: [ELEMENTS.md](../../plans/ELEMENTS.md)
