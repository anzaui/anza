# Dialog

Modal overlay wrapping the native `<dialog>` element for focus trap, backdrop, and Escape handling.

**Tag:** `ui-dialog` · **Import:** `@adukiorg/anza/elements/dialog`

---

## Import

```javascript
import '@adukiorg/anza/elements/dialog';
```

---

## Basic usage

```html
<ui-dialog id="confirm">
  <h2>Confirm</h2>
  <p>Delete this item?</p>
  <ui-button type="button">Cancel</ui-button>
  <ui-button type="button">Delete</ui-button>
</ui-dialog>

<script type="module">
  const dlg = document.querySelector('#confirm');
  dlg.showModal();
  // dlg.close('ok');
</script>
```

---

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `open` | Boolean | Reflect | Mirrors open state; set via `showModal()` / `close()` |

## Events

| Event | When |
| ----- | ---- |
| `show` | After `showModal()` |
| `close` | When the native dialog closes; `detail.returnValue` |
| `cancel` | Cancelable; mirrors native `cancel` (Escape) |

## Notes

Methods: `showModal()`, `close(returnValue?)`. Default slot is the dialog body. Native surface is `part="dialog"`.

This element is the modal-dialog branch of the overlay kit (alongside [drawer](drawer.md) / [sheet](sheet.md)). Architecture: [Overlay patterns](overlay.md).

### Lifecycle / memory

Open/close and Escape handling stay on the dialog instance. Soft-nav aborts the hosting leaf’s `ctrl` so shadow-scoped listeners tear down with disconnect. Do not add raw `document` listeners from a leaf without `{ signal: ctrl.signal }`. See [Memory safety & framework globals](../ui/advanced.md) and [Orphan listeners after soft-nav](../events/troubleshooting.md).

---

## Related

- [Elements overview](index.md)
- [Overlay patterns](overlay.md)
- [Drawer](drawer.md) / [Sheet](sheet.md)
- [Platform API](../platform/api.md)
- [Form association](../ui/forms.md) (when `form: true`)
- [Memory safety & framework globals](../ui/advanced.md)
- Planning: [ELEMENTS.md](../../plans/ELEMENTS.md)
