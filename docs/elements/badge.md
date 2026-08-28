# Badge

Compact label indicator with variant mapping (info, success, warning, error) and size scaling.

**Tag:** `ui-badge` · **Import:** `@anzaui/anza/elements/badge`

## Import

```javascript
import '@anzaui/anza/elements/badge';
```

## Basic usage

```html
<ui-badge variant="info">New</ui-badge>
<ui-badge variant="success" size="sm">Done</ui-badge>
<ui-badge variant="error">Failed</ui-badge>
```

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `variant` | String | Reflect | Visual tone (e.g. info / success / warning / error — theme-dependent) |
| `size` | String | Reflect | Size scale token for the badge |

## Notes

Default slot content is the badge label.

## Related

- [Elements overview](index.md)
- [Primitives](primitives.md)
- [Planning: ELEMENTS.md](../../plans/ELEMENTS.md)
