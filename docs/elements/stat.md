---
seo_title: "Stat — Anza"
description: "ui-stat — KPI panel with a label, a large value and a change line coloured by trend up, down or neutral."
---

# Stat

A panel showing one metric: a label, a large value and a change line.

**Tag:** `ui-stat` · **Import:** `@anzaui/anza/elements/stat`

## Usage

```javascript
import '@anzaui/anza/elements/stat';
```

```html
<ui-stat trend="up">
  <span slot="label">Revenue</span>
  $48,200
  <span slot="change">+12% vs last month</span>
</ui-stat>
```

## Attributes

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `trend` | String | — | Colour of the change line: `up` or `positive` (success), `down` or `negative` (error), `neutral` (secondary content). Without the attribute the change line inherits its colour. |

## Slots

| Slot | Content |
| ---- | ------- |
| `label` | Small uppercase label |
| default | The value |
| `change` | The change line |

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `label` | The label area |
| `value` | The value area |
| `trend` | The change line area |

## Related

- [Elements](index.md#data)
- [Card](card.md)
- [Chart](chart.md)
