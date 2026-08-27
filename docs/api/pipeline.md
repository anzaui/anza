# Pipeline

The API client processes every request through a composable interceptor chain. Outbound interceptors modify the request descriptor. Inbound interceptors normalize the response or error.

---

## Outbound Interceptors

Modify the request before it hits the network, or short-circuit with a cached/mock response:

```javascript
import { api } from '@anzaui/anza/api';

api.pipeline.outbound((descriptor) => {
  // Add an auth header to every request
  descriptor.headers.set('X-Request-ID', descriptor.requestId);
  return descriptor;
});
```

Return a `Response` to short-circuit the pipeline entirely:

```javascript
api.pipeline.outbound((descriptor) => {
  if (descriptor.url === '/mock/user') {
    return new Response(JSON.stringify({ name: 'Mock' }));
  }
  return descriptor;
});
```

---

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

Inbound interceptors receive either a `Response` or an `Error`. They must return a `Response` or throw. The final interceptor's return value is what the caller receives.

---

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

---

## Built-In Interceptors

The API client registers one inbound interceptor automatically for telemetry:

```javascript
api.pipeline.inbound((responseOrError) => {
  // Emits 'status:xxx', 'type:json', 'error', 'failed', etc.
});
```

You can add your own alongside it. The built-in interceptor runs first (registered at module load), then yours.

---

## Request Descriptor

Outbound interceptors receive and should return a descriptor object:

```javascript
{
  requestId,    // unique UUID for this request
  url,          // resolved URL after prefix routing
  method,       // HTTP method
  headers,      // Headers instance
  body,         // request body
  signal,       // AbortSignal
  priority,     // task priority
  timeout,      // timeout in ms
  cache,        // cache strategy name
  retries,      // retry attempts
  ...opts       // additional options
}
```
