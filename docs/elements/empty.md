# Empty

Empty-state panel with illustration, title, description, and optional CTA slot.

**Tag:** `ui-empty` · **Import:** `@adukiorg/anza/elements/empty`

---

## Import

```javascript
import '@adukiorg/anza/elements/empty';
```

---

## Basic usage

```html
<ui-empty></ui-empty>
<ui-empty title="No projects" description="Create a project to get started.">
  <ui-button>New project</ui-button>
</ui-empty>
```

---

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `title` | String | Reflect | Heading text (default “No records found”) |
| `description` | String | Reflect | Supporting copy under the title |

## Slots / parts

| Name | Kind | Description |
| ---- | ---- | ----------- |
| `illustration` | slot | Custom illustration (default SVG) |
| _(default)_ | slot | Actions / CTAs |
| `illustration` | part | Illustration wrapper |
| `title` | part | Title heading |
| `description` | part | Description paragraph |
| `actions` | part | Actions row |

---

## Related

- [Elements overview](index.md)
- [Feedback](feedback.md)
- [Alert](alert.md)
- Planning: [ELEMENTS.md](../../plans/ELEMENTS.md)
