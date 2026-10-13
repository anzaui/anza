---
seo_title: "Divider — Anza"
description: "ui-divider — horizontal or vertical separator line with a spacing attribute and role separator."
---

# Divider

A thin separator line between blocks or inline items.

**Tag:** `ui-divider` · **Import:** `@anzaui/anza/elements/divider`

## Usage

```javascript
import '@anzaui/anza/elements/divider';
```

```html
<ui-divider orientation="horizontal" spacing="4"></ui-divider>
```

## Attributes

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `orientation` | String | `horizontal` | `horizontal` or `vertical`. The default is written to the attribute on connect. |
| `spacing` | String | — | Space on both sides of the line. A spacing step (`4` → `var(--space-4)`) or a length containing `px` or `rem`. Sets `--divider-space`. |

## Keyboard and accessibility

The divider sets `role="separator"` on the host unless it already has a `role`.

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `line` | The `<hr>` |

### Custom properties

| Property | Default |
| -------- | ------- |
| `--divider-color` | `var(--color-border-default)` |
| `--divider-space` | `var(--space-2)` |

## Related

- [Elements](index.md#primitives)
- [Stack](stack.md)
