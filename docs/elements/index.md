# Elements

Shipped custom element kit under `library/src/elements/`. These are ready-made `ui-*` components — distinct from the [`element()` factory docs](../ui/elements.md).

Import one element (registers the custom element as a side effect) or the full barrel:

```javascript
import '@anzaui/anza/elements/button';
// or
import '@anzaui/anza/elements';
```

Paths resolve via the package import map (`library/importmap.json`): `@anzaui/anza/elements/<name>` → `/elements/<category>/<name>/index.js`.

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
| primitives | [button](button.md) | `ui-button` | `@anzaui/anza/elements/button` | Full |
| primitives | [icon](icon.md) | `ui-icon` | `@anzaui/anza/elements/icon` | Full |
| primitives | [badge](badge.md) | `ui-badge` | `@anzaui/anza/elements/badge` | Full |
| primitives | [avatar](avatar.md) | `ui-avatar` | `@anzaui/anza/elements/avatar` | Full |
| primitives | [divider](divider.md) | `ui-divider` | `@anzaui/anza/elements/divider` | Full |
| primitives | [text](text.md) | `ui-text` | `@anzaui/anza/elements/text` | Full |
| primitives | [link](link.md) | `ui-link` | `@anzaui/anza/elements/link` | Full |
| primitives | [spinner](spinner.md) | `ui-spinner` | `@anzaui/anza/elements/spinner` | Full |
| forms | [input](input.md) | `ui-input` | `@anzaui/anza/elements/input` | Full |
| forms | [textarea](textarea.md) | `ui-textarea` | `@anzaui/anza/elements/textarea` | Full |
| forms | [select](select.md) | `ui-select` | `@anzaui/anza/elements/select` | Full |
| forms | [checkbox](checkbox.md) | `ui-checkbox` | `@anzaui/anza/elements/checkbox` | Full |
| forms | [radio](radio.md) | `ui-radio` | `@anzaui/anza/elements/radio` | Full |
| forms | [toggle](toggle.md) | `ui-toggle` | `@anzaui/anza/elements/toggle` | Full |
| forms | [field](field.md) | `ui-field` | `@anzaui/anza/elements/field` | Full |
| forms | [upload](upload.md) | `ui-upload` | `@anzaui/anza/elements/upload` | Full |
| forms | [form](form.md) | `ui-form` | `@anzaui/anza/elements/form` | Full |
| overlay | [dialog](dialog.md) | `ui-dialog` | `@anzaui/anza/elements/dialog` | Full |
| overlay | [popover](popover.md) | `ui-popover` | `@anzaui/anza/elements/popover` | Full |
| overlay | [tooltip](tooltip.md) | `ui-tooltip` | `@anzaui/anza/elements/tooltip` | Full |
| overlay | [menu](menu.md) | `ui-menu` | `@anzaui/anza/elements/menu` | Full |
| overlay | [drawer](drawer.md) | `ui-drawer` | `@anzaui/anza/elements/drawer` | Full |
| overlay | [sheet](sheet.md) | `ui-sheet` | `@anzaui/anza/elements/sheet` | Full |
| feedback | [alert](alert.md) | `ui-alert` | `@anzaui/anza/elements/alert` | Full |
| feedback | [toast](toast.md) | `ui-toast` | `@anzaui/anza/elements/toast` | Full |
| feedback | [progress](progress.md) | `ui-progress` | `@anzaui/anza/elements/progress` | Full |
| feedback | [skeleton](skeleton.md) | `ui-skeleton` | `@anzaui/anza/elements/skeleton` | Full |
| feedback | [empty](empty.md) | `ui-empty` | `@anzaui/anza/elements/empty` | Full |
| data | [table](table.md) | `ui-table` | `@anzaui/anza/elements/table` | Full |
| data | [list](list.md) | `ui-list` | `@anzaui/anza/elements/list` | Full |
| data | [card](card.md) | `ui-card` | `@anzaui/anza/elements/card` | Full |
| data | [chart](chart.md) | `ui-chart` | `@anzaui/anza/elements/chart` | Full |
| data | [stat](stat.md) | `ui-stat` | `@anzaui/anza/elements/stat` | Full |
| navigation | [nav](nav.md) | `ui-nav` | `@anzaui/anza/elements/nav` | Full |
| navigation | [tabs](tabs.md) | `ui-tabs` | `@anzaui/anza/elements/tabs` | Full |
| navigation | [breadcrumb](breadcrumb.md) | `ui-breadcrumb` | `@anzaui/anza/elements/breadcrumb` | Full |
| navigation | [pagination](pagination.md) | `ui-pagination` | `@anzaui/anza/elements/pagination` | Full |
| navigation | [steps](steps.md) | `ui-steps` | `@anzaui/anza/elements/steps` | Full |
| layout | [app](app.md) | `ui-app` | `@anzaui/anza/elements/app` | Full |
| layout | [header](header.md) | `ui-header` | `@anzaui/anza/elements/header` | Full |
| layout | [sidebar](sidebar.md) | `ui-sidebar` | `@anzaui/anza/elements/sidebar` | Full |
| layout | [stack](stack.md) | `ui-stack` | `@anzaui/anza/elements/stack` | Full |
| layout | [grid](grid.md) | `ui-grid` | `@anzaui/anza/elements/grid` | Full |
| layout | [split](split.md) | `ui-split` | `@anzaui/anza/elements/split` | Full |
| layout | [scroll](scroll.md) | `ui-scroll` | `@anzaui/anza/elements/scroll` | Full |
| layout | [surface](surface.md) | `ui-surface` | `@anzaui/anza/elements/surface` | Full |

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
