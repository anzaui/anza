# Popover

Lightweight contextual overlay using the native Popover API for top-layer rendering and light dismiss.

**Tag:** `ui-popover` · **Import:** `@anzaui/anza/elements/popover`

Architecture and when-to-use: [Overlay patterns](overlay.md).

---

## Import

```javascript
import '@anzaui/anza/elements/popover';
```

---

## Basic usage

```html
<ui-button id="more" type="button">More</ui-button>
<ui-popover id="panel">
  <p>Contextual content</p>
</ui-popover>

<script type="module">
  const panel = document.querySelector('#panel');
  document.querySelector('#more').addEventListener('click', () => panel.toggle());
  panel.addEventListener('toggle', (e) => {
    console.log(e.detail.newState); // 'open' | 'closed'
  });
</script>
```

---

## Props

None. Open state is driven by methods / the native popover.

## Methods

| Method | Description |
| ------ | ----------- |
| `show()` | Opens via `showPopover()` |
| `hide()` | Closes via `hidePopover()` |
| `toggle()` | Toggles open / closed |

## Events

| Event | When |
| ----- | ---- |
| `toggle` | After open/close; `detail.newState` is `'open'` \| `'closed'` |

## Notes

Default slot projects into `part="popover"`. Uses `[popover="auto"]` (top-layer; polyfill when the Popover API is missing).

### Lifecycle / memory

Listeners stay on the popover surface inside the shadow. Soft-nav aborts the leaf `ctrl`. Prefer `on` / signal-owned work over raw `document` listeners. See [Overlay patterns](overlay.md) and [Memory safety & framework globals](../ui/advanced.md).

---

## Related

- [Overlay patterns](overlay.md)
- [Menu](menu.md)
- [Dialog](dialog.md)
- [Elements overview](index.md)
- [Platform API](../platform/api.md) (`guard.popover`)
- [Guards](../platform/guards.md)
- Planning: [ELEMENTS.md](../../plans/ELEMENTS.md)
