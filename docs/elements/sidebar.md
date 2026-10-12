---
seo_title: "Sidebar — Anza"
description: "ui-sidebar — sticky side panel that collapses to a narrow rail with the collapsed attribute or toggle()."
---

# Sidebar

A sticky side panel that can collapse to a narrow rail.

**Tag:** `ui-sidebar` · **Import:** `@anzaui/anza/elements/sidebar`

## Usage

```javascript
import '@anzaui/anza/elements/sidebar';
```

```html
<ui-sidebar>
  <ui-link href="/">Home</ui-link>
  <ui-link href="/settings">Settings</ui-link>
</ui-sidebar>
```

## Attributes

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `collapsed` | Boolean | `false` | Narrows the sidebar to `var(--space-16)` and hides its slotted children. |

The sidebar is `calc(var(--space-16) * 4)` wide and sticks below a `var(--space-16)` header. The width change is animated.

## Slots

| Slot | Content |
| ---- | ------- |
| default | Sidebar content |

## Methods

| Method | Description |
| ------ | ----------- |
| `toggle()` | Flips `collapsed`. |

```javascript
document.querySelector('ui-sidebar').toggle();
```

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `wrapper` | The scrolling content column |

## Related

- [Elements](index.md#layout)
- [App](app.md)
- [Nav](nav.md)
