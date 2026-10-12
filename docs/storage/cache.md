# Cache

The Cache API wrapper provides TTL support by attaching an `x-expires-at` header to cached responses. It is separate from the API client's cache and intended for general asset and data caching.

## Basic Use

```javascript
import { storage } from '@anzaui/anza/storage';

// Cache a JSON response
await storage.set('config', { theme: 'dark' }, 'cache');

// Retrieve (the cached body is parsed as JSON, or returned as text)
const data = await storage.get('config', 'cache');
```

## TTL

```javascript
// Cache for 5 minutes
await storage.set('feed', response, { tier: 'cache', ttl: 300000 });
```

Expired entries are evicted on read. The `x-expires-at` header stores the expiry timestamp.

## Cache Name

The Cache API adapter itself is internal. Choose the cache pool name with
`storage.configure()` before first use:

```javascript
import { storage } from '@anzaui/anza/storage';

storage.configure({ cache: { name: 'my-cache' } });

await storage.set('/api/data', data, { tier: 'cache', ttl: 60000 });
const cached = await storage.get('/api/data', 'cache');
```

## Clear

```javascript
await storage.clear('cache'); // deletes every entry in the cache pool
```

## Use Cases

- Offline-first API responses
- Preloaded assets for SPA navigation
- Image caching with expiry
- Configuration data that updates infrequently
