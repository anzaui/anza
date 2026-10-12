---
title: "Elements"
order: 4
seo_title: "Elements — Anza"
description: "The ui-* custom element kit: every element by category, with imports and shared behaviour."
---

# Elements

The kit is a set of ready-made `ui-*` custom elements in `library/src/elements/`. Each one is built with the [`element()` factory](../ui/factory.md). To build your own, read that page.

Import one element, or the whole kit:

```javascript
import '@anzaui/anza/elements/button';
// or
import '@anzaui/anza/elements';
```

Importing registers the tag. The package import map resolves `@anzaui/anza/elements/<name>` to `/elements/<category>/<name>/index.js`. The barrel also exports `showToast`:

```javascript
import { showToast } from '@anzaui/anza/elements';
```

## Primitives

| Element | Tag | What it is |
| ------- | --- | ---------- |
| [Button](button.md) | `ui-button` | Form-associated button with variants, sizes and a loading state |
| [Icon](icon.md) | `ui-icon` | SVG sprite icon |
| [Badge](badge.md) | `ui-badge` | Compact status label |
| [Avatar](avatar.md) | `ui-avatar` | Profile image with an initials fallback |
| [Divider](divider.md) | `ui-divider` | Horizontal or vertical separator |
| [Text](text.md) | `ui-text` | Typography bound to the design tokens |
| [Link](link.md) | `ui-link` | Router-aware link |
| [Spinner](spinner.md) | `ui-spinner` | Indeterminate loading indicator |

## Forms

Input, textarea, select, checkbox, radio and toggle are form-associated (as is `ui-button`): they submit with a native `<form>`, take part in validation, and restore their first-mount value on form reset. Field, upload and form are plain wrappers. See [Form-associated elements](../ui/form-associated.md).

| Element | Tag | What it is |
| ------- | --- | ---------- |
| [Input](input.md) | `ui-input` | Single-line text control |
| [Textarea](textarea.md) | `ui-textarea` | Multi-line text control |
| [Select](select.md) | `ui-select` | Dropdown built on the Popover API |
| [Checkbox](checkbox.md) | `ui-checkbox` | Checkbox with an indeterminate state |
| [Radio](radio.md) | `ui-radio` | Radio button, grouped by `name` |
| [Toggle](toggle.md) | `ui-toggle` | On/off switch |
| [Field](field.md) | `ui-field` | Label, hint and error wrapper for a control |
| [Upload](upload.md) | `ui-upload` | Drag-and-drop file picker |
| [Form](form.md) | `ui-form` | Validates its controls and submits JSON |

## Overlay

| Element | Tag | What it is |
| ------- | --- | ---------- |
| [Dialog](dialog.md) | `ui-dialog` | Modal dialog on the native `<dialog>` |
| [Popover](popover.md) | `ui-popover` | Anchored panel on the Popover API |
| [Tooltip](tooltip.md) | `ui-tooltip` | Hover and focus hint |
| [Menu](menu.md) | `ui-menu` | Keyboard-navigable action menu |
| [Drawer](drawer.md) | `ui-drawer` | Side panel on the native `<dialog>` |
| [Sheet](sheet.md) | `ui-sheet` | Bottom sheet with drag to dismiss |

[Overlay patterns](overlay.md) explains how the overlays share the top layer.

## Feedback

| Element | Tag | What it is |
| ------- | --- | ---------- |
| [Alert](alert.md) | `ui-alert` | Inline message with a severity |
| [Toast](toast.md) | `ui-toast` | Temporary notification |
| [Progress](progress.md) | `ui-progress` | Determinate progress bar |
| [Skeleton](skeleton.md) | `ui-skeleton` | Loading placeholder |
| [Empty](empty.md) | `ui-empty` | Empty-state panel |

## Data

| Element | Tag | What it is |
| ------- | --- | ---------- |
| [Table](table.md) | `ui-table` | Styled wrapper for a native table |
| [List](list.md) | `ui-list` | List panel |
| [Card](card.md) | `ui-card` | Card with header, body and footer slots |
| [Chart](chart.md) | `ui-chart` | Canvas bar or line chart |
| [Stat](stat.md) | `ui-stat` | Metric with a label and a trend |

## Navigation

| Element | Tag | What it is |
| ------- | --- | ---------- |
| [Nav](nav.md) | `ui-nav` | Navigation landmark |
| [Tabs](tabs.md) | `ui-tabs` | Tab list with keyboard navigation |
| [Breadcrumb](breadcrumb.md) | `ui-breadcrumb` | Breadcrumb trail |
| [Pagination](pagination.md) | `ui-pagination` | Previous/next page control |
| [Steps](steps.md) | `ui-steps` | Step indicator |

## Layout

| Element | Tag | What it is |
| ------- | --- | ---------- |
| [App](app.md) | `ui-app` | Application shell with header, sidebar and main slots |
| [Header](header.md) | `ui-header` | Top bar |
| [Sidebar](sidebar.md) | `ui-sidebar` | Collapsible side panel |
| [Stack](stack.md) | `ui-stack` | Flex stack with a gap |
| [Grid](grid.md) | `ui-grid` | Responsive CSS grid |
| [Split](split.md) | `ui-split` | Two-pane layout |
| [Scroll](scroll.md) | `ui-scroll` | Scroll container |
| [Surface](surface.md) | `ui-surface` | Flat, elevated or bordered panel |

## Styling

Every element page has a Styling section with three lists:

- `::part()` names you can style from outside the shadow root.
- Component custom properties, set on the host (for example `--btn-bg` on `ui-button`). They default to semantic tokens.
- Custom states, matched with `:state()` (for example `ui-checkbox:state(checked)`).

```css
ui-checkbox:state(checked)::part(box) {
  border-width: 2px;
}
```

## Cleanup

Elements bind their listeners and observers to the component `AbortController` (`ctrl.signal`). When a soft navigation swaps a page, the old page's elements disconnect and their listeners are removed. Overlays use the native top layer in place. `showToast()` is the one exception: it puts its toasts in a container under `document.body`, so they survive page swaps.

If you add listeners to `document` or `window` from an element, pass `{ signal: ctrl.signal }`. See [Context](../ui/context.md) and [Orphan listeners after soft-nav](../events/troubleshooting.md).

## Related

- [UI `element()` factory](../ui/factory.md)
- [Form-associated elements](../ui/form-associated.md)
- [Hydration](../ui/hydration.md)
