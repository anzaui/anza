# Header

Top bar with brand and actions slots.

**Tag:** `ui-header` · **Import:** `@adukiorg/anza/elements/header`

---

## Import

```javascript
import '@adukiorg/anza/elements/header';
```

---

## Basic usage

```html
<ui-header>
  <span slot="brand">Anza</span>
  <ui-button>Sign in</ui-button>
</ui-header>
```

---

## Props

_None — composition via slots._

## Slots / parts

| Name | Kind | Description |
| ---- | ---- | ----------- |
| `brand` | slot | Logo / product name |
| _(default)_ | slot | Actions |
| `header` / `brand` / `actions` | parts | Region wrappers |

---

## Related

- [Elements overview](index.md)
- [Layout](layout.md)
- [App](app.md)
- Planning: [ELEMENTS.md](../../plans/ELEMENTS.md)
