# Textarea

Form-participating multi-line text control with ElementInternals validation and optional auto-resize.

**Tag:** `ui-textarea` · **Import:** `@anzaui/anza/elements/textarea`

---

## Import

```javascript
import '@anzaui/anza/elements/textarea';
```

---

## Basic usage

```html
<ui-textarea name="bio" placeholder="Tell us about yourself" rows="4"></ui-textarea>
<ui-textarea autoresize maxlength="500" required></ui-textarea>
```

---

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `value` | String | Reflect | Current value; synced on `input` |
| `placeholder` | String | Reflect | Placeholder text |
| `disabled` | Boolean | Reflect + custom state | Disables the control |
| `required` | Boolean | Reflect | HTML required |
| `minlength / maxlength` | Number | Reflect | Length constraints |
| `autoresize` | Boolean | Reflect | Grow height to fit content |
| `rows` | Number | Reflect | Initial row count on the inner textarea |

## Events

| Event | When |
| ----- | ---- |
| `change` | Bubbles when the inner textarea fires `change` |


## Notes

Uses `form: true`. Form reset restores the attribute `value` (or empty).

---

## Related

- [Elements overview](index.md)
- [Forms](forms.md)
- [Form association](../ui/forms.md)
- [Planning: ELEMENTS.md](../../plans/ELEMENTS.md)
