# Errors

Every failure in the API client is normalized to a `PlatformError`. This gives you structured error handling with codes, context, and recovery guidance.

## PlatformError

```javascript
class PlatformError extends Error {
  name: 'PlatformError',
  code: string,          // error category
  message: string,       // human-readable description
  cause: Error | null,  // original error (if any)
  context: object,      // request context (url, method, status, etc.)
  recoverable: boolean  // can retry help?
}
```

## Error Codes

| Code | Meaning | Recoverable |
| ------ | --------- | ------------- |
| `HTTP_ERROR` | Server returned non-2xx status | 5xx yes, 4xx no |
| `NETWORK_ERROR` | Fetch failed (offline, DNS, CORS) | yes |
| `NETWORK_TIMEOUT` | Request exceeded timeout limit | yes |

## Handling Errors

```javascript
import { api } from '@anzaui/anza/api';

try {
  await api.get('/user/profile');
} catch (err) {
  if (err.code === 'HTTP_ERROR') {
    console.log('Server error:', err.context.status);
    if (err.context.status === 404) {
      showNotFound();
    }
  }
  if (err.code === 'NETWORK_TIMEOUT') {
    showToast('Slow connection — please try again');
  }
  if (err.code === 'NETWORK_ERROR') {
    showToast('You are offline');
  }
}
```

## Recovery Patterns

### Retry on Transient Failures

The client retries automatically for:

- `NETWORK_TIMEOUT`
- `NETWORK_ERROR`
- `HTTP_ERROR` with status >= 500

Client errors (4xx) are not retried. Adjust `retries` per request:

```javascript
await api.get('/critical', { retries: 5 });
```

### Custom Retry Logic

For advanced cases, use the `retry` utility directly:

```javascript
import { retry } from '@anzaui/anza/api';

const result = await retry(
  () => api.get('/unstable'),
  { attempts: 5, base: 200, maxDelay: 5000 }
);
```

## Error Events

Listen for errors via telemetry:

```javascript
api.on('error', (event) => {
  console.error('Network error:', event.detail.error);
});

api.on('failed', (event) => {
  console.error('Request failed:', event.detail.error || event.detail.response);
});

api.on('timeout', (event) => {
  console.error('Timed out:', event.detail.error);
});
```

## Non-Recoverable Errors

Some errors are marked `recoverable: false`. These include:

- Aborted requests
- 4xx client errors (the server rejected the request as invalid)

Do not retry these automatically. Fix the request or notify the user.
