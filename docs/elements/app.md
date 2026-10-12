---
seo_title: "App — Anza"
description: "ui-app — full-height application shell with header, sidebar and main slots that stacks below 768px."
---

# App

A full-height application shell with a header, a sidebar and a main area.

**Tag:** `ui-app` · **Import:** `@anzaui/anza/elements/app`

## Usage

```javascript
import '@anzaui/anza/elements/app';
import '@anzaui/anza/elements/header';
import '@anzaui/anza/elements/sidebar';
```

```html
<ui-app>
  <ui-header slot="header">
    <strong slot="brand">Acme</strong>
  </ui-header>
  <ui-sidebar slot="sidebar">Navigation</ui-sidebar>
  <p>Page content</p>
</ui-app>
```

The app has no attributes. The host is at least `100vh` tall. The sidebar and main area sit side by side, and stack in a column when the viewport is 768px wide or less.

## Slots

| Slot | Content |
| ---- | ------- |
| `header` | Top bar, usually `ui-header` |
| `sidebar` | Side panel, usually `ui-sidebar` |
| default | Main content, inside a `<main>` |

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `frame` | The row holding the sidebar and main area |
| `main` | The `<main>` |

## Related

- [Elements](index.md#layout)
- [Header](header.md)
- [Sidebar](sidebar.md)
