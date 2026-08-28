# List

List panel with optional bordered surface. Children should use `role="listitem"` when they are list items.

**Tag:** `ui-list` · **Import:** `@anzaui/anza/elements/list`

## Import

```javascript
import '@anzaui/anza/elements/list';
```

## Basic usage

```html
<ui-list>
  <div role="listitem">First</div>
  <div role="listitem">Second</div>
</ui-list>
<ui-list bordered>
  <div role="listitem">Bordered item</div>
</ui-list>
```

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `bordered` | Boolean | Reflect | Adds a bordered panel treatment |

## Notes

Inner container uses `role="list"` and `part="list"`.

## Related

- [Elements overview](index.md)
- [Data](data.md)
- [Table](table.md)
- Planning: [ELEMENTS.md](../../plans/ELEMENTS.md)
