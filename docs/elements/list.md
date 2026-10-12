---
seo_title: "List — Anza"
description: "ui-list — vertical list with divided rows and an optional bordered panel."
---

# List

A vertical list whose rows are padded and divided by borders.

**Tag:** `ui-list` · **Import:** `@anzaui/anza/elements/list`

## Usage

```javascript
import '@anzaui/anza/elements/list';
```

```html
<ui-list bordered>
  <div role="listitem">Inbox <ui-badge>4</ui-badge></div>
  <div role="listitem">Archive</div>
</ui-list>
```

## Attributes

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `bordered` | Boolean | `false` | Draws a border, radius and elevated background around the list. |

## Slots

| Slot | Content |
| ---- | ------- |
| default | The rows. Direct children that are `div[role="listitem"]` or `ui-list-item` get row padding, a bottom border (except the last) and a hover background. |

## Keyboard and accessibility

The inner wrapper has `role="list"`. Give each row `role="listitem"`.

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `list` | The `role="list"` wrapper |

## Related

- [Elements](index.md#data)
- [Table](table.md)
- [Card](card.md)
