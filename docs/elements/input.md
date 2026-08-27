# Input

Form-participating text control wrapping a native `<input>` with ElementInternals validation and form value sync.

**Tag:** `ui-input` · **Import:** `@anzaui/anza/elements/input`

---

## Import

```javascript
import '@anzaui/anza/elements/input';
```

---

## Basic usage

```html
<ui-input name="email" type="email" placeholder="you@example.com" required></ui-input>
<ui-input type="password" minlength="8"></ui-input>
```

---

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `type` | String | Reflect, default `text` | Forwarded to the inner input (`text`, `email`, `password`, `number`, …) |
| `value` | String | Reflect | Current value; synced on `input` |
| `placeholder` | String | Reflect | Placeholder text |
| `disabled` | Boolean | Reflect + custom state | Disables the control |
| `required` | Boolean | Reflect | HTML required |
| `minlength / maxlength` | Number | Reflect | Length constraints |
| `min / max` | Number | Reflect | Numeric constraints |
| `pattern` | String | Reflect | Validation pattern |

## Events

| Event | When |
| ----- | ---- |
| `change` | Bubbles when the inner input fires `change` |

## Notes

Named `error` slot for validation messaging. Form reset restores the attribute `value` (or empty).

---

## Related

- [Elements overview](index.md)
- [Form association](../ui/forms.md) (when `form: true`)
- Planning: [ELEMENTS.md](../../plans/ELEMENTS.md)
