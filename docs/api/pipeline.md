# Pipeline

The API client processes every request through a composable interceptor chain. Outbound interceptors modify the request descriptor. Inbound interceptors normalize the response or error.

## Outbound Interceptors

Modify the request before it hits the network, or short-circuit with a cached/mock response:

```javascript
import { api } from '@anzaui/anza/api';

api.pipeline.outbound((descriptor) => {
  // Tag every request with its ID
  const headers = new Headers(descriptor.headers);
  headers.set('X-Request-ID', descriptor.requestId);
  return { ...descriptor, headers };
});
```

`descriptor.headers` is a `Headers` instance unless the caller passed a `headers` option, in which case it is that plain object. Wrap it in `new Headers()` as above.

Return a `Response` to short-circuit the pipeline. Caching, retries and the network are skipped; inbound interceptors still run. Set `Content-Type` so the client parses JSON:

```javascript
api.pipeline.outbound((descriptor) => {
  if (descriptor.url === '/mock/user') {
    return new Response(JSON.stringify({ name: 'Mock' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  return descriptor;
});
```

## Inbound Interceptors

Normalize responses or errors after the network call:

```javascript
api.pipeline.inbound((responseOrError) => {
  if (responseOrError instanceof Error) {
    console.error('Pipeline caught error:', responseOrError.code);
  } else {
    console.log('Pipeline saw response:', responseOrError.status);
  }
  return responseOrError;
});
```

Inbound interceptors receive either a `Response` or an `Error`, and return a `Response` or an `Error` (a thrown error is passed on as the value). Every interceptor runs. If the final value is an `Error`, the request rejects with it; otherwise the client parses the `Response` body.

Non-2xx responses from the network reach inbound interceptors as an `HTTP_ERROR`, not as a `Response`.

## Chaining

`outbound` and `inbound` return the pipeline instance for chaining:

```javascript
api.pipeline
  .outbound(addAuthHeader)
  .outbound(addTimestamp)
  .inbound(logMetrics)
  .inbound(handleErrors);
```

Interceptors run in registration order.

## Built-In Interceptors

The API client registers one inbound interceptor at module load. It emits the telemetry events (`status:xxx`, `type:json`, `error`, `failed`, `timeout`) and returns its input unchanged. It runs first, then yours.

## Request Descriptor

Outbound interceptors receive a descriptor. Return a new or modified descriptor, a `Response`, or nothing to keep the current one.

| Field | Description |
| ----- | ----------- |
| `requestId` | Unique ID for this request |
| `url` | URL after prefix resolution |
| `method` | HTTP method |
| `headers` | `Headers` instance, or the caller's `headers` object |
| `body` | Request body (objects already JSON-serialized) |
| `signal` | Caller's `AbortSignal` |
| `priority` | Task priority |
| `timeout` | Timeout in ms |
| `cache` | Cache strategy name |
| `retries` | Total attempts |

Every other request option (`expiry`, `on`, ...) is copied onto the descriptor too.
