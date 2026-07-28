# Toggle

Form-participating switch with `role="switch"` and `:state(on)` custom state.

**Tag:** `ui-toggle` · **Import:** `@adukiorg/anza/elements/toggle`

---

## Import

```javascript
import '@adukiorg/anza/elements/toggle';
```

---

## Basic usage

```html
<ui-toggle name="notifications" checked>Email alerts</ui-toggle>
<ui-toggle disabled>Unavailable</ui-toggle>
```

---

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `checked` | Boolean | Reflect + custom state `on` | On/off state |
| `disabled` | Boolean | Reflect + custom state | Disables interaction |
| `value` | String | Reflect | Form value when on (default `on`) |

## Notes

Toggle via click or Space/Enter. Uses `form: true`. Default slot is the label content.

---

## Related

- [Elements overview](index.md)
- [Forms](forms.md)
- [Form association](../ui/forms.md)
- [Planning: ELEMENTS.md](../../plans/ELEMENTS.md)
