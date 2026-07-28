# Upload

Drag-and-drop file picker with optional progress-tracked upload via the core upload API.

**Tag:** `ui-upload` · **Import:** `@adukiorg/anza/elements/upload`

---

## Import

```javascript
import '@adukiorg/anza/elements/upload';
```

---

## Basic usage

```html
<ui-upload accept="image/*" multiple></ui-upload>
<ui-upload url="/api/upload" accept=".pdf"></ui-upload>
```

---

## Props

| Prop | Type | Reflect | Description |
| ---- | ---- | ------- | ----------- |
| `url` | String | Reflect | Upload endpoint; when unset, only `selected` fires |
| `multiple` | Boolean | Reflect | Allow multiple files |
| `accept` | String | Reflect | Forwarded to the hidden file input |

## Events

| Event | When |
| ----- | ---- |
| `selected` | Files chosen with no `url` — `detail.files` |
| `progress` | Upload progress from the core upload helper |
| `success` | Upload completed — `detail.files` |
| `error` | Upload failed — `detail` is the error |


## Notes

Click or drop onto the dropzone. With `url`, files are posted as `FormData` (`files` field) with progress UI.

### Lifecycle / memory

Dropzone and upload work use the element `ctrl.signal` so disconnect / soft-nav aborts in-flight requests and removes listeners. Prefer that pattern over raw `document` drag listeners. See [Memory safety & framework globals](../ui/advanced.md) and [Orphan listeners after soft-nav](../events/troubleshooting.md).

---

## Related

- [Elements overview](index.md)
- [Forms](forms.md)
- [Memory safety & framework globals](../ui/advanced.md)
- [Planning: ELEMENTS.md](../../plans/ELEMENTS.md)
