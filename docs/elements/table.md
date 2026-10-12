---
seo_title: "Table — Anza"
description: "ui-table — bordered, horizontally scrolling wrapper for a native HTML table."
---

# Table

A bordered wrapper that scrolls a native `<table>` horizontally when it is too wide.

**Tag:** `ui-table` · **Import:** `@anzaui/anza/elements/table`

## Usage

```javascript
import '@anzaui/anza/elements/table';
```

```html
<ui-table>
  <table>
    <thead>
      <tr><th>Name</th><th>Role</th></tr>
    </thead>
    <tbody>
      <tr><td>Ada</td><td>Admin</td></tr>
    </tbody>
  </table>
</ui-table>
```

The table has no attributes. The host draws the border, radius and elevated background and sets `overflow-x: auto`. The slotted `<table>` gets full width, collapsed borders, the sans font and the primary content colour.

`::slotted()` only reaches direct children, so rows and cells are not styled by the element. Style `th`, `td` and `tr` from your own stylesheet.

## Slots

| Slot | Content |
| ---- | ------- |
| default | A `<table>` |

## Styling

The table has no parts, custom properties or custom states.

## Related

- [Elements](index.md#data)
- [List](list.md)
