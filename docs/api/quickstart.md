# Quick Start

Get a working request in five minutes.

## 1. Make a GET Request

```javascript
import { api } from '@anzaui/anza/api';

const user = await api.get('/user/profile');
console.log(user.name);
```

The client auto-parses JSON when the response `Content-Type` is `application/json`. Otherwise it returns text.

## 2. Make a POST Request

```javascript
const result = await api.post('/posts', {
  title: 'Hello World',
  body: 'My first post'
});
```

Objects are auto-serialized to JSON. The `Content-Type: application/json` header is set automatically if not already present.

## 3. Register a Prefix

Prefix routing keeps endpoints clean and isolates environment config:

```javascript
api.prefix.add('default', 'https://api.example.com');

// Now /user/profile resolves to https://api.example.com/user/profile
const user = await api.get('/user/profile');
```

## 4. Cache a Response

```javascript
// Cache for 60 seconds
const products = await api.get('/products', { expiry: 60000 });
```

On the next call within 60 seconds, the cached response is returned without a network call. After expiry, the entry is deleted and the network is hit again.

## 5. Listen for Errors

```javascript
api.on('failed', (event) => {
  console.error('Request failed:', event.detail.error);
});

api.on('error', (event) => {
  if (event.detail.error?.context?.status === 401) redirectToLogin();
});
```

A non-2xx response rejects with an `HTTP_ERROR` and fires `error` and `failed`. `status:xxx` events fire only for 2xx responses from `get`, `post`, `put`, `patch` and `delete`.

Listeners return a disposer:

```javascript
const off = api.on('error', handler);
off(); // stop listening
```

## 6. Per-Request Events

Scope listeners to a single request with the `on` option:

```javascript
await api.get('/user/profile', {
  on: {
    'status:200': () => console.log('loaded'),
    failed: (event) => console.error(event.detail.error)
  }
});
```

These listeners are removed when the request settles. No manual disposer needed.

## 7. Stream NDJSON

```javascript
for await (const chunk of api.stream('/logs/stream')) {
  console.log(chunk.timestamp, chunk.message);
}
```

Each chunk is a parsed JSON object. `api.stream` and `api.upload` do not apply prefixes, so pass the full path or `api.prefix.resolve(path)`.

## 8. Upload a File

```javascript
const form = new FormData();
form.append('file', fileBlob);

await api.upload('/upload', form, {
  on: {
    progress: (event) => {
      const { loaded, total, percentage } = event.detail;
      console.log(`${percentage}% uploaded`);
    }
  }
});
```

## 9. Abort a Request

```javascript
const controller = new AbortController();

api.get('/slow-endpoint', { signal: controller.signal });

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);
```

## 10. Handle Errors

```javascript
import { api } from '@anzaui/anza/api';

try {
  await api.get('/protected');
} catch (err) {
  if (err.code === 'HTTP_ERROR') {
    console.log('Server returned', err.context.status);
  }
  if (err.code === 'NETWORK_TIMEOUT') {
    console.log('Request timed out');
  }
  if (err.code === 'NETWORK_ERROR') {
    console.log('Network failure');
  }
}
```

Request errors are `PlatformError`s with `code`, `message`, `context`, and `recoverable`.

## Complete Working Example

```javascript
import { api } from '@anzaui/anza/api';

// Bootstrap
api.prefix.add('default', 'https://api.example.com');

// Global error handling
api.on('error', (e) => {
  if (e.detail.error?.context?.status === 401) redirectToLogin();
});
api.on('failed', (e) => showToast(e.detail.error?.message ?? 'Request failed'));

// Cached profile
const profile = await api.get('/user/profile', { expiry: 300000 });

// Create post
await api.post('/posts', { title: 'Hello' });

// Upload avatar
const form = new FormData();
form.append('avatar', fileInput.files[0]);

await api.upload(api.prefix.resolve('/user/avatar'), form, {
  on: {
    progress: (e) => updateProgressBar(e.detail.percentage)
  }
});
```
