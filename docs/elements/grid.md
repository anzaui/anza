---
seo_title: "Grid — Anza"
description: "ui-grid — CSS grid with a cols attribute (a count or a template) and a gap attribute."
---

# Grid

A CSS grid with a column count or template and a gap.

**Tag:** `ui-grid` · **Import:** `@anzaui/anza/elements/grid`

## Usage

```javascript
import '@anzaui/anza/elements/grid';
```

```html
<ui-grid cols="3" gap="4">
  <ui-card>One</ui-card>
  <ui-card>Two</ui-card>
  <ui-card>Three</ui-card>
</ui-grid>
```

## Attributes

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `cols` | String | — | A number gives `repeat(n, minmax(0, 1fr))`. Anything else is used as `grid-template-columns`, for example `cols="200px 1fr"`. Without it the grid has one column. |
| `gap` | String | — | A spacing step (`4` → `var(--space-4)`) or a length containing `px` or `rem`. Without it there is no gap. |

The grid does not change columns by viewport width. Use a template such as `repeat(auto-fit, minmax(16rem, 1fr))` for a responsive grid.

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `grid` | The grid container |

### Custom properties

| Property | Default |
| -------- | ------- |
| `--grid-cols` | none (one column) |
| `--grid-gap` | none (no gap) |

## Related

- [Elements](index.md#layout)
- [Stack](stack.md)
- [Split](split.md)
