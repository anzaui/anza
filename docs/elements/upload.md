---
seo_title: "Upload — Anza"
description: "ui-upload: a click or drag-and-drop file picker that either reports the chosen files or POSTs them with progress events."
---

# Upload

A file picker with a click and drag-and-drop zone. With `url` set it uploads the files and shows a progress bar.

**Tag:** `ui-upload` · **Import:** `@anzaui/anza/elements/upload`

## Usage

```javascript
import '@anzaui/anza/elements/upload';
```

```html
<ui-upload url="/api/files" accept="image/*" multiple></ui-upload>
```

## Attributes

All attributes reflect to properties of the same name.

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `url` | String | none | Upload endpoint. Without it, the element only fires `selected`. |
| `multiple` | Boolean | `false` | Allow more than one file. Copied to the hidden file input. |
| `accept` | String | none | Accepted file types, as for `<input type="file">`. Copied to the hidden file input. Dropped files are not filtered. |

## Events

All events bubble and are composed.

| Event | Detail | When |
| ----- | ------ | ---- |
| `selected` | `{ files }` (a `FileList`) | Files are picked or dropped and `url` is not set. |
| `progress` | `{ loaded, total, percentage }` | During the upload, when the size is known. `percentage` is a whole number from 0 to 100. |
| `success` | `{ files }` (a `FileList`) | The server answers with a 2xx status. The response body is not passed on. |
| `error` | The `PlatformError` | The upload fails: `code` is `HTTP_ERROR` (non-2xx), `NETWORK_ERROR` (network failure, or aborted because the element disconnected) or `NETWORK_TIMEOUT`. |

## Upload request

With `url`, the files are sent as `multipart/form-data` in one `POST`, each under the field name `files`. The request uses the core `upload()` helper (XMLHttpRequest, for progress) and is aborted when the element disconnects. The progress bar hides one second after the upload ends.

## Form behaviour

`ui-upload` is not form-associated. Its files are not part of a surrounding form's `FormData`.

## Keyboard and accessibility

The drop zone is a `<div>` that is not focusable, so the picker cannot be opened from the keyboard. The prompt text ("Click to upload or drag and drop") is fixed in the template.

## Styling

### Parts

| Part | Element |
| ---- | ------- |
| `dropzone` | The click and drop area |
| `progress` | The progress bar track (hidden when idle) |
| `progress-fill` | The progress bar fill |

### Custom properties

| Property | Default |
| -------- | ------- |
| `--upload-bg` | `var(--color-surface-page)` |
| `--upload-border` | `var(--color-border-default)` |
| `--upload-border-focus` | `var(--color-border-focus)` |
| `--upload-radius` | `var(--radius-lg)` |
| `--upload-padding` | `var(--space-8)` |
| `--upload-color` | `var(--color-content-secondary)` |

`--upload-border-focus` colours the drop zone border while a file is dragged over it. There are no custom states.

## Related

- [Elements](index.md#forms)
- [Uploads](../api/uploads.md)
- [Lifecycle](../ui/lifecycle.md#memory-safety)
