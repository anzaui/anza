# Field

Field wrapper that coordinates label, required marker, hint, error, and a control slot.

**Tag:** `ui-field` · **Import:** `@adukiorg/anza/elements/field`

---

## Import

```javascript
import '@adukiorg/anza/elements/field';
```

---

## Basic usage

```html
<ui-field label="Email" required>
  <ui-input name="email" type="email" required></ui-input>
  <span slot="hint">We'll never share this.</span>
  <span slot="error">Enter a valid email.</span>
</ui-field>
```

---

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `label` | String | Reflect | Label text when the `label` slot is empty |
| `required` | Boolean | Reflect | Shows the required marker |

## Notes

Slots: `label`, `hint`, default (control), `error`. Not form-associated itself — wrap form controls inside.

---

## Related

- [Elements overview](index.md)
- [Forms](forms.md)
- [Input](input.md)
- [Planning: ELEMENTS.md](../../plans/ELEMENTS.md)
