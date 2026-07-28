# Link

Router-aware hyperlink that intercepts same-origin clicks for soft navigation and tracks `aria-current`.

**Tag:** `ui-link` · **Import:** `@adukiorg/anza/elements/link`

---

## Import

```javascript
import '@adukiorg/anza/elements/link';
```

---

## Basic usage

```html
<ui-link href="/docs/intro/index">Introduction</ui-link>
<ui-link href="https://example.com" external>External</ui-link>
```

---

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `href` | String | Reflect | Destination URL |
| `target` | String | Reflect | Forwarded to the inner `<a>` (e.g. `_blank`) |
| `current` | String | Reflect | Explicit `aria-current` value; auto-sets `page` when path matches |
| `external` | Boolean | Reflect | Treat as external (also auto when `http(s):`) |

## Events

| Event | When |
| ----- | ---- |
| `external` | Cancelable; fired for external clicks before the browser follows the link |


## Notes

Same-origin clicks call `router.navigate(href)` unless modified keys, `#` hashes, or `target="_blank"`. External links show an indicator icon.

---

## Related

- [Elements overview](index.md)
- [Primitives](primitives.md)
- [Router](../router/index.md)
- [Planning: ELEMENTS.md](../../plans/ELEMENTS.md)
