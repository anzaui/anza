---
seo_title: "Card — Anza"
description: "ui-card — content card with header, body and footer slots and an interactive hover lift."
---

# Card

A bordered panel with header, body and footer areas.

**Tag:** `ui-card` · **Import:** `@anzaui/anza/elements/card`

## Usage

```javascript
import '@anzaui/anza/elements/card';
```

```html
<ui-card>
  <h3 slot="header">Plan</h3>
  <p>Pro, billed monthly.</p>
  <ui-button slot="footer">Change</ui-button>
</ui-card>
```

## Attributes

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `interactive` | Boolean | `false` | Pointer cursor, and on hover the card lifts, its shadow grows and its border darkens. |

## Slots

| Slot | Content |
| ---- | ------- |
| `header` | Top area, divided from the body by a border |
| default | The body |
| `footer` | Bottom area, right-aligned, on the page surface colour |

The header and footer areas keep their padding and border even when their slot is empty.

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `header` | The header area |
| `body` | The body area |
| `footer` | The footer area |

## Related

- [Elements](index.md#data)
- [Surface](surface.md)
- [Stat](stat.md)
