---
seo_title: "Link — Anza"
description: "ui-link — router-aware link: soft navigation for local hrefs, aria-current, an external event, and unsafe schemes dropped."
---

# Link

A link that navigates through the router for local URLs and marks itself as the current page.

**Tag:** `ui-link` · **Import:** `@anzaui/anza/elements/link`

## Usage

```javascript
import '@anzaui/anza/elements/link';
```

```html
<ui-link href="/docs/intro">Introduction</ui-link>
<ui-link href="https://example.com" target="_blank">Example</ui-link>
```

## Attributes

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `href` | String | — | Destination. A `javascript:`, `data:` or `vbscript:` URL, or one that does not parse, is dropped: the inner `<a>` gets no `href`. |
| `target` | String | — | Copied to the inner `<a>`. |
| `current` | String | — | Explicit `aria-current` value for the inner `<a>`. Without it, the link sets `aria-current="page"` when its path and query match the current URL. |
| `external` | Boolean | `false` | Treat the link as external. Any `href` starting with `http://` or `https://` is external too. External links show an indicator icon. |

## Slots

| Slot | Content |
| ---- | ------- |
| default | The link text |

## Events

| Event | Detail | When |
| ----- | ------ | ---- |
| `external` | `{ href, target }` | An external link is clicked. Bubbles, composed and cancelable. Call `preventDefault()` to stop the browser following it. |

## Navigation

A click on a non-external link calls `router.navigate(href)` instead of loading the page. The link leaves the click to the browser when there is no `href`, `target="_blank"`, the `href` starts with `#`, the click was already prevented, it is not the main button, or Ctrl, Meta, Shift or Alt is held.

`aria-current` is recomputed after every route match (the router `found` event).

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `anchor` | The inner `<a>` |

The colours come from `--link-color`, `--link-color-hover` and `--link-color-active`, inherited from the page. The shipped tokens do not define them.

## Related

- [Elements](index.md#primitives)
- [Nav](nav.md)
- [Breadcrumb](breadcrumb.md)
- [Navigation](../router/navigation.md)
