# Card

Content card with header, body, and footer slots. Optional interactive hover lift.

**Tag:** `ui-card` · **Import:** `@anzaui/anza/elements/card`

---

## Import

```javascript
import '@anzaui/anza/elements/card';
```

---

## Basic usage

```html
<ui-card>
  <span slot="header">Account</span>
  Profile summary goes here.
  <span slot="footer">Updated today</span>
</ui-card>
<ui-card interactive>
  Clickable-looking card body
</ui-card>
```

---

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `interactive` | Boolean | Reflect | Enables hover lift / interactive styling |

## Slots / parts

| Name | Kind | Description |
| ---- | ---- | ----------- |
| `header` | slot | Card header |
| _(default)_ | slot | Body |
| `footer` | slot | Footer |
| `header` / `body` / `footer` | parts | Section wrappers |

---

## Related

- [Elements overview](index.md)
- [Data](data.md)
- [Surface](surface.md)
- Planning: [ELEMENTS.md](../../plans/ELEMENTS.md)
