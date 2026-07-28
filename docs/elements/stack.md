# Stack

Vertical flex stack with configurable gap.

**Tag:** `ui-stack` · **Import:** `@adukiorg/anza/elements/stack`

---

## Import

```javascript
import '@adukiorg/anza/elements/stack';
```

---

## Basic usage

```html
<ui-stack gap="4">
  <div>One</div>
  <div>Two</div>
  <div>Three</div>
</ui-stack>
<ui-stack gap="1.5rem">
  <p>Custom gap</p>
  <p>Second</p>
</ui-stack>
```

---

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `gap` | String | Reflect | Sets `--stack-gap` (CSS length/`rem`, or space token name → `var(--space-*)`) |

## Notes

Children go in the default slot (`part="stack"`).

---

## Related

- [Elements overview](index.md)
- [Layout](layout.md)
- [Grid](grid.md)
- Planning: [ELEMENTS.md](../../plans/ELEMENTS.md)
