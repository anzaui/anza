# Steps

Linear step indicator for multi-step workflows. Marks completed / active / upcoming from `active` index.

**Tag:** `ui-steps` · **Import:** `@anzaui/anza/elements/steps`

## Import

```javascript
import '@anzaui/anza/elements/steps';
```

## Basic usage

```html
<ui-steps active="1">
  <div>Account</div>
  <div>Details</div>
  <div>Confirm</div>
</ui-steps>
```

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `active` | Number | Reflect | Zero-based index of the active step (default `0`) |

## Notes

Slotted children get `role="step"` and a `state` of `completed`, `active`, or unset. Connector fill uses `part="line"` / `part="line-fill"`. `slotchange` listener is bound with component `on` (signal-owned).

### Lifecycle / memory

`on.slotchange` is tied to `ctrl.signal` — soft-nav disconnect aborts it. Prefer prop-driven `active` updates over attaching long-lived document listeners.

## Related

- [Elements overview](index.md)
- [Navigation](navigation.md)
- [Tabs](tabs.md)
- [Memory safety & framework globals](../ui/advanced.md)
- Planning: [ELEMENTS.md](../../plans/ELEMENTS.md)
