---
seo_title: "Nav — Anza"
description: "ui-nav — navigation landmark that lays out ui-link children in a row or a column."
---

# Nav

A navigation landmark that lays out links in a row or a column.

**Tag:** `ui-nav` · **Import:** `@anzaui/anza/elements/nav`

## Usage

```javascript
import '@anzaui/anza/elements/nav';
import '@anzaui/anza/elements/link';
```

```html
<ui-nav orientation="vertical">
  <ui-link href="/">Home</ui-link>
  <ui-link href="/settings">Settings</ui-link>
</ui-nav>
```

## Attributes

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `orientation` | String | — | `horizontal` (row, centred, `--space-4` gap) or `vertical` (column, `--space-1` gap). Without the attribute the links sit in a row with no gap: the property defaults to `horizontal` but the default is not reflected to the attribute. |

## Slots

| Slot | Content |
| ---- | ------- |
| default | Links. Direct `ui-link` children get padding, a radius and a hover background. |

A `ui-link` child with `aria-current="page"` on the host element is highlighted. `ui-link` sets `aria-current` on its inner `<a>`, not on itself, so set the attribute yourself if you want the highlight.

## Keyboard and accessibility

The host gets `role="navigation"` unless it has a `role`. The template also wraps the slot in a `<nav>`.

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `nav` | The inner `<nav>` |

## Related

- [Elements](index.md#navigation)
- [Link](link.md)
- [Sidebar](sidebar.md)
