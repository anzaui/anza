---
seo_title: "Surface — Anza"
description: "ui-surface — padded panel with flat, elevated or bordered variants built from surface tokens."
---

# Surface

A padded panel with a background, border and radius from the design tokens.

**Tag:** `ui-surface` · **Import:** `@anzaui/anza/elements/surface`

## Usage

```javascript
import '@anzaui/anza/elements/surface';
```

```html
<ui-surface variant="elevated">Content</ui-surface>
```

## Attributes

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `variant` | String | — | `flat` (page surface, medium radius), `elevated` (elevated surface, `--shadow-md`, large radius) or `bordered` (page surface, no shadow, large radius). All three draw a 1px default border. Without the attribute no variant styles apply: the property defaults to `flat` but the default is not reflected to the attribute. |

## Slots

| Slot | Content |
| ---- | ------- |
| default | Panel content |

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `surface` | The panel |

### Custom properties

| Property | Default |
| -------- | ------- |
| `--surface-bg` | Set by `variant` |
| `--surface-border` | Set by `variant` |
| `--surface-shadow` | Set by `variant` (`flat` sets none) |
| `--surface-radius` | Set by `variant` |

## Related

- [Elements](index.md#layout)
- [Card](card.md)
