---
seo_title: "Split — Anza"
description: "ui-split — two-pane row with a 1-1, 1-2 or 2-1 ratio that stacks below 768px."
---

# Split

Two panes side by side that stack on narrow screens.

**Tag:** `ui-split` · **Import:** `@anzaui/anza/elements/split`

## Usage

```javascript
import '@anzaui/anza/elements/split';
```

```html
<ui-split ratio="2-1">
  <section>Main</section>
  <aside>Details</aside>
</ui-split>
```

## Attributes

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `ratio` | String | — | Flex ratio of the first to the last child: `1-1`, `1-2` or `2-1`. Without the attribute the panes keep their natural width: the property defaults to `1-1` but the default is not reflected to the attribute. |

The panes are `var(--space-6)` apart. At 768px viewport width or less they stack in a column `var(--space-4)` apart.

## Slots

| Slot | Content |
| ---- | ------- |
| default | Two panes |

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `split` | The flex row |

## Related

- [Elements](index.md#layout)
- [Grid](grid.md)
