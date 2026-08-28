# Cache

The Cache API wrapper provides TTL support by attaching an `x-expires-at` header to cached responses. It is separate from the API client's cache and intended for general asset and data caching.

## Basic Use

```javascript
import { storage } from '@anzaui/anza/storage';

// Cache a JSON response
await storage.set('config', { theme: 'dark' }, 'cache');

// Retrieve
const res = await storage.get('config', 'cache');
const data = await res.json();
```

## TTL

```javascript
// Cache for 5 minutes
await storage.set('feed', response, { tier: 'cache', ttl: 300000 });
```

Expired entries are evicted on read. The `x-expires-at` header stores the expiry timestamp.

## Direct CacheStorage

```javascript
import { CacheStorage } from '@anzaui/anza/storage';

const cache = new CacheStorage('my-cache');

// Store a Response
await cache.set('/api/data', new Response(JSON.stringify(data)), 60000);

// Retrieve
const res = await cache.get('/api/data');
```

## Clear

```javascript
await cache.clear(); // deletes entire cache pool
```

## Use Cases

- Offline-first API responses
- Preloaded assets for SPA navigation
- Image caching with expiry
- Configuration data that updates infrequently
