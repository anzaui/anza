# Split

Two-pane split layout controlled by a ratio token.

**Tag:** `ui-split` · **Import:** `@adukiorg/anza/elements/split`

---

## Import

```javascript
import '@adukiorg/anza/elements/split';
```

---

## Basic usage

```html
<ui-split>
  <div>Left</div>
  <div>Right</div>
</ui-split>
<ui-split ratio="1-2">
  <aside>Narrow</aside>
  <main>Wide</main>
</ui-split>
```

---

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `ratio` | String | Reflect | Pane ratio token (default `1-1`; e.g. `1-2`) |

## Notes

Two children in the default slot; `part="split"` wraps them.

---

## Related

- [Elements overview](index.md)
- [Layout](layout.md)
- [Grid](grid.md)
- [Sidebar](sidebar.md)
- Planning: [ELEMENTS.md](../../plans/ELEMENTS.md)
