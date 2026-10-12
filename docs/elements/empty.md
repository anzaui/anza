---
seo_title: "Empty — Anza"
description: "ui-empty: empty-state panel with an illustration slot, title, description and an actions slot."
---

# Empty

Centered empty-state panel with an illustration, a title, a description and actions.

**Tag:** `ui-empty` · **Import:** `@anzaui/anza/elements/empty`

## Usage

```html
<ui-empty title="No projects yet" description="Create a project to get started.">
  <ui-button type="button">New project</ui-button>
</ui-empty>
```

```javascript
import '@anzaui/anza/elements/empty';
```

## Attributes

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `title` | String | "No records found" | Heading text (rendered in an `<h3>`). |
| `description` | String | "Try adjusting your search criteria or add new records." | Paragraph below the heading. |

Both are set as plain text. `title` is also the global HTML attribute, so browsers show it as a native hover tooltip on the element.

## Slots

| Slot | Content |
| ---- | ------- |
| `illustration` | Image or icon above the title. Defaults to a circle-with-dash SVG. Slotted `svg` and `img` are sized to `--space-12 * 2`. |
| (default) | Actions, laid out in a centered row |

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `illustration` | Wrapper around the illustration slot |
| `title` | The `<h3>` heading |
| `description` | The `<p>` description |
| `actions` | Wrapper around the default slot |

## Related

- [Alert](alert.md)
- [Skeleton](skeleton.md)
- [Elements](index.md#feedback)
