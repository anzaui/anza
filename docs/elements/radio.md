# Radio

Form-participating radio that coordinates selection with siblings sharing the same `name`.

**Tag:** `ui-radio` · **Import:** `@adukiorg/anza/elements/radio`

---

## Import

```javascript
import '@adukiorg/anza/elements/radio';
```

---

## Basic usage

```html
<ui-radio name="plan" value="free" checked>Free</ui-radio>
<ui-radio name="plan" value="pro">Pro</ui-radio>
```

---

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `checked` | Boolean | Reflect + custom state | Selected state |
| `disabled` | Boolean | Reflect + custom state | Disables interaction |
| `name` | String | Reflect | Group name; checking one unchecks others with the same name |
| `value` | String | Reflect | Form value when checked (default `on`) |

## Events

| Event | When |
| ----- | ---- |
| `change` | Fired on siblings that become unchecked when this radio is selected |


## Notes

Defaults `role="radio"` and `aria-checked`. Uses `form: true`.

---

## Related

- [Elements overview](index.md)
- [Forms](forms.md)
- [Form association](../ui/forms.md)
- [Planning: ELEMENTS.md](../../plans/ELEMENTS.md)
