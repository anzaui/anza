# Spinner

Indeterminate loading spinner using the Web Animations API, with prefers-reduced-motion respect.

**Tag:** `ui-spinner` · **Import:** `@anzaui/anza/elements/spinner`

---

## Import

```javascript
import '@anzaui/anza/elements/spinner';
```

---

## Basic usage

```html
<ui-spinner></ui-spinner>
<ui-spinner aria-label="Saving"></ui-spinner>
```

---

## Props

_None — style via CSS / ARIA attributes only._

## Notes

Defaults `role="progressbar"` and `aria-label="Loading"`. Animation pauses when `prefers-reduced-motion: reduce` matches. No reflected props — style via CSS / parts.

---

## Related

- [Elements overview](index.md)
- [Primitives](primitives.md)
- [Planning: ELEMENTS.md](../../plans/ELEMENTS.md)
