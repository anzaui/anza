# Sheet

Bottom sheet overlay backed by native `<dialog>` + `showModal()`, with drag-to-dismiss on the handle.

**Tag:** `ui-sheet` · **Import:** `@adukiorg/anza/elements/sheet`

Architecture and when-to-use: [Overlay patterns](overlay.md).

---

## Import

```javascript
import '@adukiorg/anza/elements/sheet';
```

---

## Basic usage

```html
<ui-sheet id="filters">
  <h2>Filters</h2>
  <!-- drag the handle to dismiss -->
</ui-sheet>

<script type="module">
  document.querySelector('#filters').show();
  // hide() or open = false closes after the exit transition
</script>
```

---

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `open` | Boolean | Reflect | Mirrors open state; synced to `dialog.showModal()` / `close()` |

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

Default slot projects into `part="content"`. Drag handle is `part="handle"` (dismiss threshold ~120px). Dialog surface is `part="dialog"`. Same modal-dialog family as [dialog](dialog.md) and [drawer](drawer.md).

### Lifecycle / memory

Pointer drag and close handling stay on the sheet instance / `el.ctrl`. Soft-nav aborts teardown. See [Overlay patterns](overlay.md) and [Memory safety & framework globals](../ui/advanced.md).

---

## Related

- [Overlay patterns](overlay.md)
- [Dialog](dialog.md)
- [Drawer](drawer.md)
- [Elements overview](index.md)
- [Platform API](../platform/api.md)
- Planning: [ELEMENTS.md](../../plans/ELEMENTS.md)
