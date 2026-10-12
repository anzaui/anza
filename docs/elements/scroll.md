---
seo_title: "Scroll — Anza"
description: "ui-scroll — vertical scroll viewport that fills its parent, with optional mandatory scroll snapping."
---

# Scroll

A vertical scroll viewport that fills its parent.

**Tag:** `ui-scroll` · **Import:** `@anzaui/anza/elements/scroll`

## Usage

```javascript
import '@anzaui/anza/elements/scroll';
```

```html
<ui-scroll snap style="height: 20rem">
  <section>One</section>
  <section>Two</section>
</ui-scroll>
```

## Attributes

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `snap` | Boolean | `false` | Sets `scroll-snap-type: y mandatory`. Slotted children always have `scroll-snap-align: start`. |

The host is `100%` of its parent's height. The viewport scrolls vertically and hides horizontal overflow.

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `viewport` | The scrolling element |

## Related

- [Elements](index.md#layout)
- [Stack](stack.md)
