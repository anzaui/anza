# Button

Form-associated button with loading and disabled states, semantic token styling, and an `activate` event.

**Tag:** `ui-button` · **Import:** `@adukiorg/anza/elements/button`

---

## Import

```javascript
import '@adukiorg/anza/elements/button';
```

---

## Basic usage

```html
<ui-button type="button">Save</ui-button>
<ui-button type="submit">Submit</ui-button>
<ui-button disabled>Unavailable</ui-button>
<ui-button loading>Working…</ui-button>
```

---

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `disabled` | Boolean | Reflect + custom state | Disables the inner button and blocks activation |
| `loading` | Boolean | Reflect + custom state | Loading state; blocks activation while true |
| `type` | String | Reflect, default `button` | `button` | `submit` | `reset` — submit/reset use `ElementInternals.form` |
| `value` | String | Reflect | Optional form value |

## Events

| Event | When |
| ----- | ---- |
| `activate` | Fired on click when not disabled/loading |

## Notes

Default slot content becomes the button label. Uses `form: true` so it participates in native forms.

---

## Related

- [Elements overview](index.md)
- [Form association](../ui/forms.md) (when `form: true`)
- Planning: [ELEMENTS.md](../../plans/ELEMENTS.md)
