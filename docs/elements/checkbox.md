# Checkbox

Form-participating checkbox with checked / indeterminate states and ElementInternals custom states.

**Tag:** `ui-checkbox` · **Import:** `@anzaui/anza/elements/checkbox`

## Import

```javascript
import '@anzaui/anza/elements/checkbox';
```

## Basic usage

```html
<ui-checkbox name="tos" value="accepted" required>I agree</ui-checkbox>
<ui-checkbox indeterminate>Partial</ui-checkbox>
```

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `checked` | Boolean | Reflect + custom state | Checked state |
| `indeterminate` | Boolean | Reflect + custom state | Indeterminate (cleared when checked) |
| `disabled` | Boolean | Reflect + custom state | Disables interaction |
| `required` | Boolean | Reflect | Must be checked to be valid |
| `value` | String | Reflect | Form value when checked (default `on`) |

## Notes

Toggle via click or Space/Enter. Uses `form: true`. Default slot is the label content.

## Related

- [Elements overview](index.md)
- [Forms](forms.md)
- [Form association](../ui/forms.md)
- [Planning: ELEMENTS.md](../../plans/ELEMENTS.md)
