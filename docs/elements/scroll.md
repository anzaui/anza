---
seo_title: "Scroll — Anza"
description: "ui-scroll — scroll viewport with optional snap."
---

# Scroll

Scroll viewport with optional scroll-snap.

**Tag:** `ui-scroll` · **Import:** `@anzaui/anza/elements/scroll`

## Import

```javascript
import '@anzaui/anza/elements/scroll';
```

## Basic usage

```html
<ui-scroll style="height: 12rem">
  <p>Long content…</p>
</ui-scroll>
<ui-scroll snap style="height: 12rem">
  <section>Snap 1</section>
  <section>Snap 2</section>
</ui-scroll>
```

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `snap` | Boolean | Reflect | Enables scroll-snap behavior when set |

## Notes

Content lives in `part="viewport"`.

## Related

- [Elements overview](index.md)
- [Layout](layout.md)
- [Surface](surface.md)
