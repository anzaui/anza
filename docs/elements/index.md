# Elements

Shipped custom element kit under `library/src/elements/`. These are ready-made `ui-*` components — distinct from the [`element()` factory docs](../ui/elements.md).

Import one element (registers the custom element as a side effect) or the full barrel:

```javascript
import '@adukiorg/anza/elements/button';
// or
import '@adukiorg/anza/elements';
```

Paths resolve via the package import map (`library/importmap.json`): `@adukiorg/anza/elements/<name>` → `/elements/<category>/<name>/index.js`.

---

## Categories

| Category | Overview |
| -------- | -------- |
| [Primitives](primitives.md) | Buttons, icons, text, badges, … |
| [Forms](forms.md) | Input, select, checkbox, field, … |
| [Overlay](overlay.md) | Dialog, drawer, menu, tooltip, … |
| [Feedback](feedback.md) | Alert, toast, progress, skeleton, … |
| [Data](data.md) | Table, list, card, chart, stat |
| [Navigation](navigation.md) | Tabs, nav, breadcrumb, pagination, steps |
| [Layout](layout.md) | App, header, sidebar, stack, grid, … |

---

## Full reference

### Phase 1

| Element | Route |
| ------- | ----- |
| [Button](button.md) | `/docs/elements/button` |
| [Input](input.md) | `/docs/elements/input` |
| [Dialog](dialog.md) | `/docs/elements/dialog` |
| [Alert](alert.md) | `/docs/elements/alert` |
| [Tabs](tabs.md) | `/docs/elements/tabs` |

### Phase 2 — Primitives + forms

| Element | Route |
| ------- | ----- |
| [Icon](icon.md) | `/docs/elements/icon` |
| [Badge](badge.md) | `/docs/elements/badge` |
| [Avatar](avatar.md) | `/docs/elements/avatar` |
| [Divider](divider.md) | `/docs/elements/divider` |
| [Text](text.md) | `/docs/elements/text` |
| [Link](link.md) | `/docs/elements/link` |
| [Spinner](spinner.md) | `/docs/elements/spinner` |
| [Textarea](textarea.md) | `/docs/elements/textarea` |
| [Select](select.md) | `/docs/elements/select` |
| [Checkbox](checkbox.md) | `/docs/elements/checkbox` |
| [Radio](radio.md) | `/docs/elements/radio` |
| [Toggle](toggle.md) | `/docs/elements/toggle` |
| [Field](field.md) | `/docs/elements/field` |
| [Upload](upload.md) | `/docs/elements/upload` |
| [Form](form.md) | `/docs/elements/form` |

### Phase 3 — Feedback

| Element | Route |
| ------- | ----- |
| [Toast](toast.md) | `/docs/elements/toast` |
| [Progress](progress.md) | `/docs/elements/progress` |
| [Skeleton](skeleton.md) | `/docs/elements/skeleton` |
| [Empty](empty.md) | `/docs/elements/empty` |

### Overlay kit (Full)

| Element | Route |
| ------- | ----- |
| [Popover](popover.md) | `/docs/elements/popover` |
| [Tooltip](tooltip.md) | `/docs/elements/tooltip` |
| [Menu](menu.md) | `/docs/elements/menu` |
| [Drawer](drawer.md) | `/docs/elements/drawer` |
| [Sheet](sheet.md) | `/docs/elements/sheet` |

Architecture: [Overlay patterns](overlay.md). Tooltip escape uses `escapeOverflow` / `guard.escape` ([plans/ELEMENTS.md](../../plans/ELEMENTS.md)).

### Phase 4 — Data + navigation + layout

| Element | Route |
| ------- | ----- |
| [Table](table.md) | `/docs/elements/table` |
| [List](list.md) | `/docs/elements/list` |
| [Card](card.md) | `/docs/elements/card` |
| [Chart](chart.md) | `/docs/elements/chart` |
| [Stat](stat.md) | `/docs/elements/stat` |
| [Nav](nav.md) | `/docs/elements/nav` |
| [Breadcrumb](breadcrumb.md) | `/docs/elements/breadcrumb` |
| [Pagination](pagination.md) | `/docs/elements/pagination` |
| [Steps](steps.md) | `/docs/elements/steps` |
| [App](app.md) | `/docs/elements/app` |
| [Header](header.md) | `/docs/elements/header` |
| [Sidebar](sidebar.md) | `/docs/elements/sidebar` |
| [Stack](stack.md) | `/docs/elements/stack` |
| [Grid](grid.md) | `/docs/elements/grid` |
| [Split](split.md) | `/docs/elements/split` |
| [Scroll](scroll.md) | `/docs/elements/scroll` |
| [Surface](surface.md) | `/docs/elements/surface` |

---

## Inventory

| Category | Element | Tag | Import | Status |
| -------- | ------- | --- | ------ | ------ |
| primitives | [button](button.md) | `ui-button` | `@adukiorg/anza/elements/button` | Full |
| primitives | [icon](icon.md) | `ui-icon` | `@adukiorg/anza/elements/icon` | Full |
| primitives | [badge](badge.md) | `ui-badge` | `@adukiorg/anza/elements/badge` | Full |
| primitives | [avatar](avatar.md) | `ui-avatar` | `@adukiorg/anza/elements/avatar` | Full |
| primitives | [divider](divider.md) | `ui-divider` | `@adukiorg/anza/elements/divider` | Full |
| primitives | [text](text.md) | `ui-text` | `@adukiorg/anza/elements/text` | Full |
| primitives | [link](link.md) | `ui-link` | `@adukiorg/anza/elements/link` | Full |
| primitives | [spinner](spinner.md) | `ui-spinner` | `@adukiorg/anza/elements/spinner` | Full |
| forms | [input](input.md) | `ui-input` | `@adukiorg/anza/elements/input` | Full |
| forms | [textarea](textarea.md) | `ui-textarea` | `@adukiorg/anza/elements/textarea` | Full |
| forms | [select](select.md) | `ui-select` | `@adukiorg/anza/elements/select` | Full |
| forms | [checkbox](checkbox.md) | `ui-checkbox` | `@adukiorg/anza/elements/checkbox` | Full |
| forms | [radio](radio.md) | `ui-radio` | `@adukiorg/anza/elements/radio` | Full |
| forms | [toggle](toggle.md) | `ui-toggle` | `@adukiorg/anza/elements/toggle` | Full |
| forms | [field](field.md) | `ui-field` | `@adukiorg/anza/elements/field` | Full |
| forms | [upload](upload.md) | `ui-upload` | `@adukiorg/anza/elements/upload` | Full |
| forms | [form](form.md) | `ui-form` | `@adukiorg/anza/elements/form` | Full |
| overlay | [dialog](dialog.md) | `ui-dialog` | `@adukiorg/anza/elements/dialog` | Full |
| overlay | [popover](popover.md) | `ui-popover` | `@adukiorg/anza/elements/popover` | Full |
| overlay | [tooltip](tooltip.md) | `ui-tooltip` | `@adukiorg/anza/elements/tooltip` | Full |
| overlay | [menu](menu.md) | `ui-menu` | `@adukiorg/anza/elements/menu` | Full |
| overlay | [drawer](drawer.md) | `ui-drawer` | `@adukiorg/anza/elements/drawer` | Full |
| overlay | [sheet](sheet.md) | `ui-sheet` | `@adukiorg/anza/elements/sheet` | Full |
| feedback | [alert](alert.md) | `ui-alert` | `@adukiorg/anza/elements/alert` | Full |
| feedback | [toast](toast.md) | `ui-toast` | `@adukiorg/anza/elements/toast` | Full |
| feedback | [progress](progress.md) | `ui-progress` | `@adukiorg/anza/elements/progress` | Full |
| feedback | [skeleton](skeleton.md) | `ui-skeleton` | `@adukiorg/anza/elements/skeleton` | Full |
| feedback | [empty](empty.md) | `ui-empty` | `@adukiorg/anza/elements/empty` | Full |
| data | [table](table.md) | `ui-table` | `@adukiorg/anza/elements/table` | Full |
| data | [list](list.md) | `ui-list` | `@adukiorg/anza/elements/list` | Full |
| data | [card](card.md) | `ui-card` | `@adukiorg/anza/elements/card` | Full |
| data | [chart](chart.md) | `ui-chart` | `@adukiorg/anza/elements/chart` | Full |
| data | [stat](stat.md) | `ui-stat` | `@adukiorg/anza/elements/stat` | Full |
| navigation | [nav](nav.md) | `ui-nav` | `@adukiorg/anza/elements/nav` | Full |
| navigation | [tabs](tabs.md) | `ui-tabs` | `@adukiorg/anza/elements/tabs` | Full |
| navigation | [breadcrumb](breadcrumb.md) | `ui-breadcrumb` | `@adukiorg/anza/elements/breadcrumb` | Full |
| navigation | [pagination](pagination.md) | `ui-pagination` | `@adukiorg/anza/elements/pagination` | Full |
| navigation | [steps](steps.md) | `ui-steps` | `@adukiorg/anza/elements/steps` | Full |
| layout | [app](app.md) | `ui-app` | `@adukiorg/anza/elements/app` | Full |
| layout | [header](header.md) | `ui-header` | `@adukiorg/anza/elements/header` | Full |
| layout | [sidebar](sidebar.md) | `ui-sidebar` | `@adukiorg/anza/elements/sidebar` | Full |
| layout | [stack](stack.md) | `ui-stack` | `@adukiorg/anza/elements/stack` | Full |
| layout | [grid](grid.md) | `ui-grid` | `@adukiorg/anza/elements/grid` | Full |
| layout | [split](split.md) | `ui-split` | `@adukiorg/anza/elements/split` | Full |
| layout | [scroll](scroll.md) | `ui-scroll` | `@adukiorg/anza/elements/scroll` | Full |
| layout | [surface](surface.md) | `ui-surface` | `@adukiorg/anza/elements/surface` | Full |

---

## Lifecycle / memory

Kit elements bind listeners and observers with the component `AbortController` (`ctrl.signal`). Soft-nav swaps only the page leaf — disconnect aborts that leaf’s `ctrl` and tears down its `on` / `watch` / signal-owned work. Prefer shadow-scoped helpers (`on` with `attrs` / `not` / `key` / `scope: 'assigned'`, `watch.slot` for light-DOM boundaries); do not attach raw `document` / `body` listeners from a leaf without a signal. Overlay kit uses native top-layer APIs in-tree; **toast** is the deliberate `document.body` portal exception. Popover polyfill attachments use framework `globals`. See [Overlay patterns](overlay.md).

See [Context — on / watch](../ui/context.md), [Memory safety & framework globals](../ui/advanced.md), and [Orphan listeners after soft-nav](../events/troubleshooting.md).

---

## Related

- [UI `element()` factory](../ui/elements.md)
- [Form association](../ui/forms.md)
- [Hydration / DSD adopt](../ui/hydration.md)
- [Memory safety & framework globals](../ui/advanced.md)
- [Events troubleshooting](../events/troubleshooting.md)
- Planning: [ELEMENTS.md](../../plans/ELEMENTS.md)
