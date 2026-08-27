# Quick Start

Get a working request in five minutes.

---

## 1. Make a GET Request

```javascript
import { api } from '@anzaui/anza/api';

const user = await api.get('/user/profile');
console.log(user.name);
```

The client auto-parses JSON when the response `Content-Type` is `application/json`. Otherwise it returns text.

---

## 2. Make a POST Request

```javascript
const result = await api.post('/posts', {
  title: 'Hello World',
  body: 'My first post'
});
```

Objects are auto-serialized to JSON. The `Content-Type: application/json` header is set automatically if not already present.

---

## 3. Register a Prefix

Prefix routing keeps endpoints clean and isolates environment config:

```javascript
api.prefix.add('default', 'https://api.example.com');

// Now /user/profile resolves to https://api.example.com/user/profile
const user = await api.get('/user/profile');
```

---

## 4. Cache a Response

```javascript
// Cache for 60 seconds
const products = await api.get('/products', { expiry: 60000 });
```

On the next call within 60 seconds, the cached response is returned instantly. After expiry, the cache is stale and the network is hit again.

---

## 5. Listen for Errors

```javascript
api.on('failed', (event) => {
  console.error('Request failed:', event.detail.error);
});

api.on('status:401', () => {
  redirectToLogin();
});
```

Listeners return a disposer:

```javascript
const off = api.on('error', handler);
off(); // stop listening
```

---

## 6. Per-Request Events

Scope listeners to a single request with the `on` option:

```javascript
await api.get('/user/profile', {
  on: {
    'status:401': () => redirectToLogin(),
    failed: (event) => console.error(event.detail.error)
  }
});
```

These listeners auto-cleanup when the request completes. No manual disposer needed.

---

## 7. Stream NDJSON

```javascript
for await (const chunk of api.stream('/logs/stream')) {
  console.log(chunk.timestamp, chunk.message);
}
```

Each chunk is a parsed JSON object. Backpressure is preserved natively via the Streams API.

---

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

---

## 9. Abort a Request

```javascript
const controller = new AbortController();

api.get('/slow-endpoint', { signal: controller.signal });

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);
```

---

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

Every error is a `PlatformError` with `code`, `message`, `context`, and `recoverable`.

---

## Complete Working Example

```javascript
import { api } from '@anzaui/anza/api';

// Bootstrap
api.prefix.add('default', 'https://api.example.com');

// Global error handling
api.on('status:401', () => redirectToLogin());
api.on('failed', (e) => showToast(e.detail.error.message));

// Cached profile
const profile = await api.get('/user/profile', { expiry: 300000 });

// Create post
await api.post('/posts', { title: 'Hello' });

// Upload avatar
const form = new FormData();
form.append('avatar', fileInput.files[0]);

await api.upload('/user/avatar', form, {
  on: {
    progress: (e) => updateProgressBar(e.detail.percentage)
  }
});
```
