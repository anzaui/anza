# Pagination

Prev / next pagination. Uses `page` when set; otherwise syncs with the URL `?page=` query via the router.

**Tag:** `ui-pagination` · **Import:** `@adukiorg/anza/elements/pagination`

---

## Import

```javascript
import '@adukiorg/anza/elements/pagination';
```

---

## Basic usage

```html
<!-- Controlled via props -->
<ui-pagination page="2" total="100" limit="10"></ui-pagination>

<!-- URL query mode (omit page — reads/writes ?page=) -->
<ui-pagination total="48" limit="12"></ui-pagination>
```

```javascript
document.querySelector('ui-pagination').addEventListener('page-change', (e) => {
  console.log(e.detail.page);
});
```

---

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `page` | Number | Reflect | Current page (when set, controls locally instead of URL) |
| `total` | Number | Reflect | Total item count |
| `limit` | Number | Reflect | Items per page (default `10`) |

## Events

| Event | When |
| ----- | ---- |
| `page-change` | After prev/next; `detail.page` is the new page |

## Notes

Parts: `button`, `prev`, `next`, `indicator`. Click handlers use shadow-scoped `on` (signal-owned). Navigation API `navigate` listener uses `{ signal: el.ctrl.signal }` when URL-synced.

### Lifecycle / memory

Prev/next `on.click` and the Navigation API listener abort with the component `ctrl`. Soft-nav disconnect clears them. Prefer this over raw `document` listeners for page changes.

---

## Related

- [Elements overview](index.md)
- [Navigation](navigation.md)
- [Tabs](tabs.md)
- [Memory safety & framework globals](../ui/advanced.md)
- Planning: [ELEMENTS.md](../../plans/ELEMENTS.md)
