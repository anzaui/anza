# Drawer

Side panel overlay backed by native `<dialog>` + `showModal()` (top-layer, focus trap).

**Tag:** `ui-drawer` · **Import:** `@adukiorg/anza/elements/drawer`

Architecture and when-to-use: [Overlay patterns](overlay.md).

---

## Import

```javascript
import '@adukiorg/anza/elements/drawer';
```

---

## Basic usage

```html
<ui-drawer id="nav-drawer" placement="left">
  <h2>Navigate</h2>
  <!-- side panel content -->
</ui-drawer>

<script type="module">
  document.querySelector('#nav-drawer').show();
  // hide() or open = false closes after the exit transition
</script>
```

---

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `open` | Boolean | Reflect | Mirrors open state; synced to `dialog.showModal()` / `close()` |
| `placement` | String | Reflect | `left` or `right` (default `right`) |

## Methods

| Method | Description |
| ------ | ----------- |
| `show()` | Sets `open` → opens modal |
| `hide()` | Clears `open` → closes after transition |

## Events

| Event | When |
| ----- | ---- |
| `close` | When the native dialog closes |

## Notes

Default slot is the drawer body. Native surface is `part="dialog"`. Same modal-dialog family as [dialog](dialog.md) and [sheet](sheet.md).

### Lifecycle / memory

Close handling stays on the dialog instance. Soft-nav aborts the leaf `ctrl`. See [Overlay patterns](overlay.md) and [Memory safety & framework globals](../ui/advanced.md).

---

## Related

- [Overlay patterns](overlay.md)
- [Dialog](dialog.md)
- [Sheet](sheet.md)
- [Elements overview](index.md)
- [Platform API](../platform/api.md)
- Planning: [ELEMENTS.md](../../plans/ELEMENTS.md)
