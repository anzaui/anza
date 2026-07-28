# Skeleton

Loading placeholder with a WAAPI shimmer; pauses when `prefers-reduced-motion: reduce`.

**Tag:** `ui-skeleton` · **Import:** `@adukiorg/anza/elements/skeleton`

---

## Import

```javascript
import '@adukiorg/anza/elements/skeleton';
```

---

## Basic usage

```html
<ui-skeleton></ui-skeleton>
<ui-skeleton width="12rem" height="1.25rem"></ui-skeleton>
<ui-skeleton variant="circle" width="48px" height="48px"></ui-skeleton>
```

---

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `variant` | String | Reflect | Visual shape hint (theme / CSS; e.g. circle) |
| `width` | String | Reflect | Sets `--skeleton-width` (CSS length, `%`, or space token name) |
| `height` | String | Reflect | Sets `--skeleton-height` (same resolution as `width`) |

## Notes

Defaults `aria-hidden="true"`. Shimmer uses `part="shimmer"`. `matchMedia` change listener and animation cleanup use `el.ctrl.signal`.

### Lifecycle / memory

The reduced-motion listener is signal-owned. Soft-nav disconnect aborts the leaf `ctrl` and tears down the listener; pause the WAAPI animation via the same abort path rather than leaving orphan `matchMedia` handlers.

---

## Related

- [Elements overview](index.md)
- [Feedback](feedback.md)
- [Spinner](spinner.md)
- [Memory safety & framework globals](../ui/advanced.md)
- Planning: [ELEMENTS.md](../../plans/ELEMENTS.md)
