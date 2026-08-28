# Events

The API client emits telemetry events for every request. Subscribe globally for application-wide hooks, or per-request for scoped cleanup.

## Global Listeners

```javascript
import { api } from '@anzaui/anza/api';

const off = api.on('status:401', (event) => {
  redirectToLogin();
});

// Stop listening
off();
```

`api.on(event, handler, signal)` returns a disposer. Pass an `AbortSignal` for automatic cleanup when a component unmounts.

## Standard Events

| Event | Trigger |
| ------- | --------- |
| `error` | Any network failure, timeout, or server error |
| `failed` | Any non-ok response (>= 400) or aborted connection |
| `timeout` | Request exceeded its timeout limit |
| `status:401` | HTTP 401 response |
| `status:500` | HTTP 500 response |
| `status:xxx` | Any specific HTTP status |
| `type:json` | Successful `application/json` response |
| `type:stream` | Successful `text/event-stream` response |
| `type:text` | Successful `text/*` response |

## Per-Request Listeners

Scope listeners to a single request using the `on` option:

```javascript
await api.get('/user/profile', {
  on: {
    'status:401': () => redirectToLogin(),
    failed: (event) => console.error(event.detail.error),
    timeout: (event) => showToast('Request timed out')
  }
});
```

These listeners are cleaned up automatically when the request completes. No manual disposer needed.

## Event Payload

All events receive an object with `type` and `detail`:

```javascript
api.on('failed', (event) => {
  console.log(event.type);      // 'failed'
  console.log(event.detail);    // { error, requestId }
});
```

The `detail` object always includes `requestId` for correlation.

## Lifecycle-Gated Cleanup

Pass an `AbortSignal` for automatic listener removal:

```javascript
mount({ ctrl }) {
  api.on('status:401', () => {
    redirectToLogin();
  }, ctrl.signal); // auto-removed on disconnect
}
```

## Emitting Custom Events

Emit telemetry events manually for custom instrumentation:

```javascript
api.emit('custom:metric', { value: 42 });
```

Custom events flow through the same bus and can be listened to with `api.on`.
