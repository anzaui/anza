# Progress

Determinate progress bar with percentage label and ARIA progressbar semantics.

**Tag:** `ui-progress` · **Import:** `@anzaui/anza/elements/progress`

## Import

```javascript
import '@anzaui/anza/elements/progress';
```

## Basic usage

```html
<ui-progress value="40" max="100"></ui-progress>
<ui-progress value="3" max="10">
  <span slot="label">Upload</span>
</ui-progress>
```

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `value` | Number | Reflect | Current progress value (default `0`) |
| `max` | Number | Reflect | Maximum value (default `100`) |

## Slots / parts

| Name | Kind | Description |
| ---- | ---- | ----------- |
| `label` | slot | Label text (default “Progress”) |
| `labels` | part | Label + percent row |
| `track` | part | Track container |
| `fill` | part | Filled portion |

## Notes

Sets `role="progressbar"` and `aria-valuenow` / `aria-valuemin` / `aria-valuemax` on update. Percent label is derived as `round((value / max) * 100)`.

## Related

- [Elements overview](index.md)
- [Feedback](feedback.md)
- [Spinner](spinner.md)
- Planning: [ELEMENTS.md](../../plans/ELEMENTS.md)
