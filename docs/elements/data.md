# Data

Tables, lists, cards, charts, and stats for displaying structured content.

Import pattern:

```javascript
import '@anzaui/anza/elements/<name>';
```

Full docs in this category: [table](table.md), [list](list.md), [card](card.md), [chart](chart.md), [stat](stat.md).

### Lifecycle / memory

Chart’s `ResizeObserver` disconnects on the component abort signal. Soft-nav disconnect aborts the leaf `ctrl`. Prefer prop updates over raw document observers. See [Memory safety & framework globals](../ui/advanced.md).

## Elements

| Element | Tag | Import | Status |
| ------- | --- | ------ | ------ |
| [table](table.md) | `ui-table` | `@anzaui/anza/elements/table` | Full |
| [list](list.md) | `ui-list` | `@anzaui/anza/elements/list` | Full |
| [card](card.md) | `ui-card` | `@anzaui/anza/elements/card` | Full |
| [chart](chart.md) | `ui-chart` | `@anzaui/anza/elements/chart` | Full |
| [stat](stat.md) | `ui-stat` | `@anzaui/anza/elements/stat` | Full |

See the [full inventory](index.md) and [ELEMENTS.md](../../plans/ELEMENTS.md) for phase status.
