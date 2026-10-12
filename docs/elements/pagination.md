---
seo_title: "Pagination — Anza"
description: "ui-pagination — Previous and Next buttons with a page indicator, driven by the page attribute or the ?page= query."
---

# Pagination

Previous and Next buttons with a "Page N of M" indicator.

**Tag:** `ui-pagination` · **Import:** `@anzaui/anza/elements/pagination`

## Usage

```javascript
import '@anzaui/anza/elements/pagination';
```

```html
<ui-pagination total="240" limit="20"></ui-pagination>
```

## Attributes

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `page` | Number | — | Current page, 1-based. When set, the buttons change this attribute. When unset (or `0`), the page comes from the URL's `?page=` query and the buttons navigate. |
| `total` | Number | `0` | Total number of items. |
| `limit` | Number | `10` | Items per page. Values below 1 count as 1. |

The page count is `ceil(total / limit)`, at least 1. The current page is clamped to that range. Previous is disabled on page 1 and Next on the last page.

In URL mode, a click sets `?page=` on the current URL and calls the router's `navigate()` with the path and query. The indicator resyncs on every Navigation API `navigate` event, where the browser supports it.

## Events

| Event | Detail | When |
| ----- | ------ | ---- |
| `page-change` | `{ page }` (the new page number) | After Previous or Next is clicked. Bubbles and composed. |

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `button` | Both buttons |
| `prev` | The Previous button |
| `next` | The Next button |
| `indicator` | The "Page N of M" text |

## Related

- [Elements](index.md#navigation)
- [Navigation](../router/navigation.md)
