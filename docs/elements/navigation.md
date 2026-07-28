# Navigation

Tabs, nav, breadcrumbs, pagination, and multi-step flows.

Import pattern:

```javascript
import '@adukiorg/anza/elements/<name>';
```


Full docs in this category: [nav](nav.md), [tabs](tabs.md), [breadcrumb](breadcrumb.md), [pagination](pagination.md), [steps](steps.md).

### Lifecycle / memory

Tabs, pagination, and steps bind click / keyboard / slotchange handlers with shadow-scoped `on` tied to `ctrl.signal`. Soft-nav disconnect aborts the leaf and clears those listeners. See [Memory safety & framework globals](../ui/advanced.md).

---

## Elements

| Element | Tag | Import | Status |
| ------- | --- | ------ | ------ |
| [nav](nav.md) | `ui-nav` | `@adukiorg/anza/elements/nav` | Full |
| [tabs](tabs.md) | `ui-tabs` | `@adukiorg/anza/elements/tabs` | Full |
| [breadcrumb](breadcrumb.md) | `ui-breadcrumb` | `@adukiorg/anza/elements/breadcrumb` | Full |
| [pagination](pagination.md) | `ui-pagination` | `@adukiorg/anza/elements/pagination` | Full |
| [steps](steps.md) | `ui-steps` | `@adukiorg/anza/elements/steps` | Full |

See the [full inventory](index.md) and [ELEMENTS.md](../../plans/ELEMENTS.md) for phase status.
