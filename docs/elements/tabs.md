# Tabs

Accessible tablist with roving tabindex, arrow / Home / End keys, and optional URL-synced `active` value.

**Tag:** `ui-tabs` · **Import:** `@adukiorg/anza/elements/tabs`

---

## Import

```javascript
import '@adukiorg/anza/elements/tabs';
```

---

## Basic usage

```html
<ui-tabs active="one">
  <button slot="tab" value="one">One</button>
  <button slot="tab" value="two">Two</button>
  <div role="tabpanel">Panel one</div>
  <div role="tabpanel">Panel two</div>
</ui-tabs>
```

---

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `active` | String | Reflect | Selected tab value (falls back to first tab) |

## Notes

Named `tab` slot for tab triggers; default slot for panels (`role="tabpanel"` or `ui-tab-panel`). Clicking a tab sets `active` from `value` or text content.

### Lifecycle / memory

Keyboard and click handlers are shadow-scoped and abort with the component `ctrl` on disconnect (including soft-nav leaf swap). See [Memory safety & framework globals](../ui/advanced.md).

---

## Related

- [Elements overview](index.md)
- [Navigation](navigation.md)
- [Form association](../ui/forms.md) (when `form: true`)
- [Memory safety & framework globals](../ui/advanced.md)
- Planning: [ELEMENTS.md](../../plans/ELEMENTS.md)
