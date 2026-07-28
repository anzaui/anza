# Table

Styled wrapper for a native HTML table (slot content). Use a light-DOM `<table>` inside for semantics.

**Tag:** `ui-table` · **Import:** `@adukiorg/anza/elements/table`

---

## Import

```javascript
import '@adukiorg/anza/elements/table';
```

---

## Basic usage

```html
<ui-table>
  <table>
    <thead>
      <tr><th>Name</th><th>Status</th></tr>
    </thead>
    <tbody>
      <tr><td>Alpha</td><td>Active</td></tr>
      <tr><td>Beta</td><td>Paused</td></tr>
    </tbody>
  </table>
</ui-table>
```

---

## Props

_None — presentational wrapper; style via CSS / slotted table markup._

## Notes

Default slot receives the table (or table wrap). Pair with a host/page `.table-wrap` if you need horizontal scroll outside the element.

---

## Related

- [Elements overview](index.md)
- [Data](data.md)
- [List](list.md)
- Planning: [ELEMENTS.md](../../plans/ELEMENTS.md)
