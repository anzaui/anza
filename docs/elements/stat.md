# Stat

KPI statistic with label, value, and optional trend/change slot.

**Tag:** `ui-stat` · **Import:** `@anzaui/anza/elements/stat`

---

## Import

```javascript
import '@anzaui/anza/elements/stat';
```

---

## Basic usage

```html
<ui-stat trend="up">
  <span slot="label">Revenue</span>
  $42k
  <span slot="change">+12%</span>
</ui-stat>
<ui-stat trend="down">
  <span slot="label">Churn</span>
  2.1%
  <span slot="change">−0.4%</span>
</ui-stat>
```

---

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `trend` | String | Reflect | Trend styling: `neutral` (default), `up`, or `down` (theme-dependent) |

## Slots / parts

| Name | Kind | Description |
| ---- | ---- | ----------- |
| `label` | slot | Metric label |
| _(default)_ | slot | Primary value |
| `change` | slot | Trend / delta text |
| `label` / `value` / `trend` | parts | Section wrappers |

---

## Related

- [Elements overview](index.md)
- [Data](data.md)
- [Chart](chart.md)
- Planning: [ELEMENTS.md](../../plans/ELEMENTS.md)
