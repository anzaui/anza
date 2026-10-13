# Uploads

`fetch` does not report upload progress. `api.upload` uses `XMLHttpRequest` instead and reports progress through telemetry events.

`api.upload` does not apply prefixes, the pipeline, caching, retries or a timeout. Pass a full path or `api.prefix.resolve(path)`. The data is sent as-is.

## Basic Upload

```javascript
import { api } from '@anzaui/anza/api';

const form = new FormData();
form.append('file', fileBlob);

const result = await api.upload('/upload', form);
```

The response is auto-parsed as JSON when possible, otherwise returned as text.

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

## Upload Options

| Option | Type | Description |
| -------- | ------ | ------------- |
| `method` | string | HTTP method (default `POST`) |
| `headers` | object | Additional headers |
| `onProgress` | function | Legacy progress callback |
| `signal` | AbortSignal | Cancel the upload |
| `on` | object | Per-request event listeners |
| `requestId` | string | ID used in event `detail` (default: generated) |

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

## Aborting Uploads

```javascript
const controller = new AbortController();

api.upload('/upload', file, { signal: controller.signal });

// Cancel after 10 seconds
setTimeout(() => controller.abort(), 10000);
```

When aborted, the upload terminates and a `PlatformError` with code `NETWORK_ERROR` is rejected.

## Raw Binary Upload

Upload raw binary data instead of `FormData`:

```javascript
const buffer = new Uint8Array(1024);
await api.upload('/binary', buffer, {
  headers: { 'Content-Type': 'application/octet-stream' }
});
```

## Upload Events

| Event | Trigger |
| ------- | --------- |
| `progress` | Upload progress update (only when the total size is known) |
| `status:xxx` | HTTP status from the upload response |
| `failed` | Non-2xx response or network error |
| `error` | Non-2xx response or network error |

Aborting rejects without emitting events. The uploader sets no timeout.
