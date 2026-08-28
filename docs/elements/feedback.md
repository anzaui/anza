# Feedback

Alerts, toasts, progress, and empty / loading states.

Import pattern:

```javascript
import '@anzaui/anza/elements/<name>';
```

Full docs in this category: [alert](alert.md), [toast](toast.md), [progress](progress.md), [skeleton](skeleton.md), [empty](empty.md).

Toast’s `show` helper is the kit’s deliberate `document.body` portal; other layered UI stays on native top-layer APIs — see [Overlay patterns](overlay.md).

### Lifecycle / memory

Toasts and similar feedback that may append a container under `body` must dispose with the creator’s abort signal — not a long-lived document listener. Soft-nav aborts only the detached leaf’s `ctrl`. Skeleton’s reduced-motion listener is signal-owned. See [Memory safety & framework globals](../ui/advanced.md) and [Orphan listeners after soft-nav](../events/troubleshooting.md).

## Elements

| Element | Tag | Import | Status |
| ------- | --- | ------ | ------ |
| [alert](alert.md) | `ui-alert` | `@anzaui/anza/elements/alert` | Full |
| [toast](toast.md) | `ui-toast` | `@anzaui/anza/elements/toast` | Full |
| [progress](progress.md) | `ui-progress` | `@anzaui/anza/elements/progress` | Full |
| [skeleton](skeleton.md) | `ui-skeleton` | `@anzaui/anza/elements/skeleton` | Full |
| [empty](empty.md) | `ui-empty` | `@anzaui/anza/elements/empty` | Full |

See the [full inventory](index.md) and [ELEMENTS.md](../../plans/ELEMENTS.md) for phase status.
