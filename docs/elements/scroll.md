# Scroll

Scroll viewport with optional scroll-snap.

**Tag:** `ui-scroll` · **Import:** `@adukiorg/anza/elements/scroll`

---

## Import

```javascript
import '@adukiorg/anza/elements/scroll';
```

---

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

---

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `snap` | Boolean | Reflect | Enables scroll-snap behavior when set |

## Notes

Content lives in `part="viewport"`.

---

## Related

- [Elements overview](index.md)
- [Layout](layout.md)
- [Surface](surface.md)
- Planning: [ELEMENTS.md](../../plans/ELEMENTS.md)
