---
seo_title: "Stack — Anza"
description: "ui-stack — vertical flex stack with a gap attribute taking a spacing step or a length."
---

# Stack

A vertical flex column with a gap between children.

**Tag:** `ui-stack` · **Import:** `@anzaui/anza/elements/stack`

## Usage

```javascript
import '@anzaui/anza/elements/stack';
```

```html
<ui-stack gap="4">
  <p>First</p>
  <p>Second</p>
</ui-stack>
```

## Attributes

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `gap` | String | — | A spacing step (`4` → `var(--space-4)`) or a length containing `px` or `rem`. Sets `--stack-gap`. Without it there is no gap. |

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `stack` | The flex column |

### Custom properties

| Property | Default |
| -------- | ------- |
| `--stack-gap` | none (no gap) |

## Related

- [Elements](index.md#layout)
- [Grid](grid.md)
