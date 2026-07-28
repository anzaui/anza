# Toast

Transient status notification. Auto-dismisses after a duration; the `show` helper portals instances into a shared fixed container under `document.body`.

**Tag:** `ui-toast` · **Import:** `@adukiorg/anza/elements/toast`

---

## Import

```javascript
import '@adukiorg/anza/elements/toast';
import { show as showToast } from '@adukiorg/anza/elements/toast';
// or from the kit barrel:
// import { showToast } from '@adukiorg/anza/elements';
```

---

## Basic usage

```javascript
import '@adukiorg/anza/elements/toast';
import { show as showToast } from '@adukiorg/anza/elements/toast';

showToast('Saved successfully.');
showToast('Still working…', { duration: 5000 });
```

Or mount a toast element yourself (same body container if you append via `show`):

```html
<ui-toast duration="4000">Copied to clipboard</ui-toast>
```

---

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `duration` | Number | Reflect | Auto-dismiss delay in ms (default `3000`) |

## Helpers

| Helper | Description |
| ------ | ----------- |
| `show(message, options?)` | Creates a `ui-toast`, sets optional `duration`, appends to the shared body container. Re-exported from the kit barrel as `showToast`. |

## Notes

Default slot is the toast body (`role="status"`, `part="toast"`). After `duration`, the toast fades out and removes itself.

### Lifecycle / memory

`show` appends a shared fixed container under `document.body` and places toasts there — ownership stays with each toast instance, not a long-lived document listener. Auto-dismiss uses `setTimeout` cleared on the element `AbortController` (`el.ctrl.signal` abort). Soft-nav aborts only the detached leaf’s `ctrl`; toasts that outlive a leaf should be created/owned where their lifetime belongs (or removed explicitly). Prefer signal-owned work over raw `document` / `body` listeners. See [Memory safety & framework globals](../ui/advanced.md) and [Orphan listeners after soft-nav](../events/troubleshooting.md).

---

## Related

- [Elements overview](index.md)
- [Feedback](feedback.md)
- [Alert](alert.md)
- [Overlay patterns](overlay.md) (native top-layer vs this body-portal exception)
- [Memory safety & framework globals](../ui/advanced.md)
- [Orphan listeners after soft-nav](../events/troubleshooting.md)
- Planning: [ELEMENTS.md](../../plans/ELEMENTS.md)
