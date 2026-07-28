# Select

Form-participating dropdown built on the Popover API and anchor positioning.

**Tag:** `ui-select` · **Import:** `@adukiorg/anza/elements/select`

---

## Import

```javascript
import '@adukiorg/anza/elements/select';
```

---

## Basic usage

```html
<ui-select name="role" placeholder="Choose role" required>
  <button type="button" value="admin">Admin</button>
  <button type="button" value="editor">Editor</button>
</ui-select>
```

---

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `value` | String | Reflect | Selected option value |
| `placeholder` | String | Reflect | Label when nothing is selected |
| `disabled` | Boolean | Reflect + custom state | Disables the trigger |
| `required` | Boolean | Reflect | Validity fails when value is empty |

## Notes

Slotted children are options; each option’s `value` attribute (or text content) becomes the select value. Uses `form: true`. Trigger / list surfaces use `part="button"` and `part="popover"` (Popover API — same top-layer strategy as the [overlay kit](overlay.md)).

---

## Related

- [Elements overview](index.md)
- [Forms](forms.md)
- [Overlay patterns](overlay.md)
- [Form association](../ui/forms.md)
- [Planning: ELEMENTS.md](../../plans/ELEMENTS.md)
