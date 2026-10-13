# Events

The API client emits telemetry events for every request. Subscribe globally for application-wide hooks, or per-request for scoped cleanup.

## Global Listeners

```javascript
import { api } from '@anzaui/anza/api';

const off = api.on('error', (event) => {
  if (event.detail.error?.context?.status === 401) redirectToLogin();
});

// Stop listening
off();
```

`api.on(event, handler, signal)` returns a disposer. Pass an `AbortSignal` for automatic cleanup when a component unmounts.

## Standard Events

| Event | Trigger |
| ------- | --------- |
| `error` | Any failed request: non-2xx response, network failure, timeout or abort |
| `failed` | Same as `error` |
| `timeout` | Request exceeded its timeout limit |
| `status:xxx` | A response with that status (for example `status:200`) |
| `type:json` | Successful `application/json` response |
| `type:stream` | Successful `text/event-stream` response |
| `type:text` | Successful `text/*` response |

For `get`, `post`, `put`, `patch` and `delete`, a non-2xx response becomes an `HTTP_ERROR` before telemetry runs. It fires `error` and `failed` with `{ error, requestId }`, not `status:xxx`. Read the status from `event.detail.error.context.status`. `upload` and `stream` fire `status:xxx` for every response.

## Per-Request Listeners

Scope listeners to a single request using the `on` option:

```javascript
await api.get('/user/profile', {
  on: {
    'status:200': () => console.log('loaded'),
    failed: (event) => console.error(event.detail.error),
    timeout: (event) => showToast('Request timed out')
  }
});
```

These listeners are removed when the request settles. No manual disposer needed.

## Event Payload

All events receive an object with `type` and `detail`:

```javascript
api.on('failed', (event) => {
  console.log(event.type);      // 'failed'
  console.log(event.detail);    // { error, requestId } or { response, requestId }
});
```

Built-in events always include `requestId` in `detail` for correlation.

## Lifecycle-Gated Cleanup

Pass an `AbortSignal` for automatic listener removal:

```javascript
const ctrl = new AbortController();

api.on('error', (event) => {
  console.error(event.detail.error);
}, ctrl.signal);

ctrl.abort(); // removes the listener
```

## Emitting Custom Events

Emit telemetry events manually for custom instrumentation:

```javascript
api.emit('custom:metric', { value: 42 });
```

Custom events flow through the same bus and can be listened to with `api.on`.
