---
seo_title: "Chart — Anza"
description: "ui-chart — canvas bar or line chart drawn from a JSON array, redrawn on resize and on attribute changes."
---

# Chart

A small canvas chart that draws a bar or line series from a JSON array of numbers.

**Tag:** `ui-chart` · **Import:** `@anzaui/anza/elements/chart`

## Usage

```javascript
import '@anzaui/anza/elements/chart';
```

```html
<ui-chart type="line" data="[12, 30, 24, 48, 40]"></ui-chart>
```

## Attributes

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `type` | String | `bar` | `bar` or `line`. Any other value draws bars. |
| `data` | String | — | JSON array of numbers. When it is missing or not valid JSON, the chart draws the sample series `[10, 30, 20, 50, 40, 60]`. |

The chart draws for the device pixel ratio and redraws when the canvas resizes (a `ResizeObserver`, disconnected on unmount) and when `type` or `data` changes. It draws four grid lines with value labels from 0 to 110% of the largest value.

Colours are read from the host's computed `--color-interactive` (series), `--color-border-default` (grid) and `--color-content-secondary` (labels). The line fill fades `--color-interactive` from 20% opacity to transparent, so the token can be any CSS colour the canvas accepts.

The host is `calc(var(--space-24) * 3)` tall. Set `height` on `ui-chart` to change it.

## Styling

The chart has no parts, custom properties or custom states.

## Related

- [Elements](index.md#data)
- [Stat](stat.md)
