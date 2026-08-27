# Uploads

Standard `fetch` does not expose upload progress in baseline browsers. The API client bridges this gap with a precise `XMLHttpRequest`-based uploader that reports real-time progress via telemetry events.

---

## Basic Upload

```javascript
import { api } from '@anzaui/anza/api';

const form = new FormData();
form.append('file', fileBlob);

const result = await api.upload('/upload', form);
```

The response is auto-parsed as JSON when possible, otherwise returned as text.

---

## Upload with Progress

```javascript
await api.upload('/upload', formData, {
  on: {
    progress: (event) => {
      const { loaded, total, percentage } = event.detail;
      updateProgressBar(percentage);
    },
    'status:200': () => {
      showToast('Upload complete');
    },
    error: (event) => {
      showToast('Upload failed: ' + event.detail.error.message);
    }
  }
});
```

---

## Upload Options

| Option | Type | Description |
| -------- | ------ | ------------- |
| `method` | string | HTTP method (default `POST`) |
| `headers` | object | Additional headers |
| `onProgress` | function | Legacy progress callback |
| `signal` | AbortSignal | Cancel the upload |
| `on` | object | Per-request event listeners |

---

## Legacy onProgress

For non-telemetry use, pass `onProgress` directly:

```javascript
await api.upload('/upload', file, {
  onProgress: ({ loaded, total, percentage }) => {
    console.log(`${percentage}%`);
  }
});
```

This is called alongside the `progress` telemetry event.

---

## Aborting Uploads

```javascript
const controller = new AbortController();

api.upload('/upload', file, { signal: controller.signal });

// Cancel after 10 seconds
setTimeout(() => controller.abort(), 10000);
```

When aborted, the upload terminates and a `PlatformError` with code `NETWORK_ERROR` is rejected.

---

## Raw Binary Upload

Upload raw binary data instead of `FormData`:

```javascript
const buffer = new Uint8Array([...]);
await api.upload('/binary', buffer, {
  headers: { 'Content-Type': 'application/octet-stream' }
});
```

---

## Upload Events

| Event | Trigger |
| ------- | --------- |
| `progress` | Upload progress update |
| `status:xxx` | HTTP status from the upload response |
| `failed` | Non-2xx response or network error |
| `error` | Network failure |
| `timeout` | Upload timed out |
