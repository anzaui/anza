# Networking & Caching Layer Usage Guide (`core.api`)

The `core.api` networking layer is a baseline-native, local-first HTTP client designed for high performance, self-healing retries, dynamic prefix routing, telemetry-driven event hooks, and fine-grained TTL caching.

---

## 1. Quick Start

Import the client directly from the ESM entry point:

```javascript
import { api } from '@anzaui/anza/api';

// Simple GET request (automatically parses JSON)
const profile = await api.get('/user/profile');
console.log(profile.name);

// Simple POST request with body serialization
const result = await api.post('/posts', { title: 'Native ESM rules' });
```

---

## 2. Dynamic Outbound Prefix Resolution

Prefixes let you map short names or sub-paths to base URLs exactly once at application bootstrap. This keeps your request endpoints clean and isolates environment configuration.

### Registering Prefixes

```javascript
import { api } from '@anzaui/anza/api';

// Add configuration at startup
api.prefix.add('auth', 'https://auth.example.com');
api.prefix.add('default', 'https://api.example.com'); // acts as root fallback
```

### Automatic Path Resolution

The client automatically detects prefixes and safely concatenates paths without duplicating slashes:

```javascript
// Resolves to: https://auth.example.com/login
const token = await api.post('auth/login', { username, password });

// Resolves to root fallback: https://api.example.com/user/profile
const profile = await api.get('/user/profile');

// Fully qualified URLs are left unchanged
const data = await api.get('https://other-domain.org/data');
```

---

## 3. Fine-Grained TTL Caching

Caching in `core.api` defaults to a **zero-cache policy** (network-only) unless an explicit expiry/TTL is provided. This prevents dynamic state mutations from serving stale data by default.

### Caching with TTL

To cache successful GET responses, pass `expiry` or `ttl` (in milliseconds) inside request options:

```javascript
// Cache is checked first. On miss, network is called and cache is populated for 60 seconds
const products = await api.get('/products', { expiry: 60000 });
```

### Cache Purging & Glob Invalidation

The cache manager supports granular deletions, whole store purges, or namespace-level invalidation utilizing standard glob patterns:

```javascript
// Purge the entire API cache store
await api.cache.clear();

// Evict a single exact URL
await api.cache.delete('https://api.example.com/products');

// Glob Purging: Evict all endpoints starting with or containing /user/
await api.cache.delete('*/user/*');
```

---

## 4. Telemetry Events & Network Monitoring

The networking layer streams real-time connection events, allowing you to attach global hooks, security checks, and toast alerts based on HTTP statuses, content types, or failures.

### Standard Telemetry Events

| Event Name | Trigger |
| --- | --- |
| `'error'` | Any network connection failure, request timeout, or server error |
| `'failed'` | Any non-ok response status (>= 400) or aborted connections |
| `'timeout'` | Requests exceeding their defined timeout limit |
| `'status:401'` | Specific HTTP 401 Unauthorized responses |
| `'status:500'` | Specific HTTP 500 Internal Server Error responses |
| `'status:xxx'` | Any specific HTTP status code (replace `xxx` with the desired code) |  
| `'type:text'` | Successful responses carrying `text/plain` Content-Type |
| `'type:json'` | Successful responses carrying `application/json` Content-Type |
| `'type:stream'` | Successful responses carrying `text/event-stream` Content-Type |

### Request-Scoped Event Listeners (Automatic Cleanup)

If you only care about events triggered by a **specific network request**, you can define listeners directly in the request options using the `on` object. The API client scopes these listeners to this single request and **automatically cleans them up** as soon as the request terminates (succeeds or fails). No manual disposer calls are needed:

```javascript
await api.get('/user/profile', {
  on: {
    // Fired only if this specific request returns a 401
    'status:401': () => {
      redirectToLogin();
    },
    // Fired only if this specific request fails or times out
    'failed': (event) => {
      console.error('Request failed:', event.detail.error);
    }
  }
});
```

### Global Listeners & Manual Disposers

For broad application state hooks (such as global loading spinners or error overlays), subscribe to events globally. The `api.on` method returns a synchronous disposer function to stop listening:

```javascript
// Register a global listener and receive a clean unsubscription function
const offUnauthorized = api.on('status:401', (event) => {
  redirectToLogin();
});

// To stop listening manually, simply invoke the returned function:
offUnauthorized();
```

### Advanced Lifecycle-Gated Cleaning (with AbortSignal)

If you are developing custom elements or reactive components, you can pass an `AbortSignal` as the third parameter to `api.on`. The networking engine will listen to the signal and **automatically clean up the listener** when the component unmounts or aborts, eliminating boilerplate disposer calls:

```javascript
// Example inside a reactive Custom Element mount hook:
mount({ el, ctrl }) {
  // Pass the element's mount AbortController signal
  api.on('status:401', () => {
    redirectToLogin();
  }, ctrl.signal);
  
  // Fully automated: detaches completely when the component unmounts!
}
```

---

## 5. Streaming & Progress Uploads

### Response Streams (NDJSON)

For live logs or AI streaming responses, the client parses newline-delimited JSON streams natively preserving backpressure. It fully supports request-scoped `on` listeners (e.g. `chunk`, `error`, `failed`) and broadcasts them to the global telemetry bus with automatic unsubscriptions:

```javascript
// Stream lines as an AsyncIterable and hook event listeners directly
const eventStream = api.stream('https://api.example.com/logs/stream', {
  on: {
    // Triggers progressively for each enqueued JSON chunk
    chunk: (event) => {
      console.log('Progressive chunk:', event.detail.chunk);
    },
    // Triggers if the connection drops mid-stream
    error: (event) => {
      console.error('Stream dropped:', event.detail.error);
    }
  }
});

for await (const chunk of eventStream) {
  // Yields parsed JSON chunks symmetrically
}
```

### Tracking Upload Progress

Standard `fetch` uploads do not support progress callbacks in Baseline browsers. The client bridges this gap utilizing a highly precise native XMLHttpRequest gateway. It fully supports request-scoped `on` listeners—enabling clean tracking of upload `progress`, HTTP `status`, success, or `error` events:

```javascript
const fileData = new FormData();
fileData.append('file', rawFileBlob);

const response = await api.upload('https://api.example.com/upload', fileData, {
  method: 'POST',
  on: {
    // Fired progressively during transmission
    progress: (event) => {
      const { loaded, total, percentage } = event.detail;
      console.log(`Uploaded: ${loaded} / ${total} (${percentage}%)`);
    },
    // Fired on successful completion
    'status:200': (event) => {
      console.log('Upload completed successfully!');
    },
    // Fired on connection errors
    error: (event) => {
      console.error('Upload failed:', event.detail.error);
    }
  }
});
```
