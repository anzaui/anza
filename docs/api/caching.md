# Caching

The API client supports fine-grained TTL caching via the browser Cache API. Caching is opt-in: by default, every request is network-only.

## TTL Caching

Enable caching by passing `expiry` or `ttl` (in milliseconds):

```javascript
import { api } from '@anzaui/anza/api';

// Cache for 60 seconds
const products = await api.get('/products', { expiry: 60000 });
```

On the first call, the network is hit and the response is cached. On subsequent calls within the TTL window, the cached response is returned instantly. After expiry, the cache entry is evicted and the network is hit again.

## Cache Strategies

For more control, use named strategies:

### cache-first

Return cached data if available, otherwise fetch and cache:

```javascript
const data = await api.get('/config', { cache: 'cache-first' });
```

Best for configuration, reference data, and static assets.

### network-first

Fetch from the network, fall back to cache on failure:

```javascript
const data = await api.get('/feed', { cache: 'network-first' });
```

Best for dynamic data where freshness matters but offline fallback is needed.

### stale-while-revalidate

Return cached data immediately, then revalidate in the background:

```javascript
const data = await api.get('/timeline', { cache: 'stale-while-revalidate' });
```

When a stale entry is served, the client fires a `cache:updated` event after the background fetch completes:

```javascript
window.addEventListener('cache:updated', (e) => {
  console.log('Cache refreshed for', e.detail.url);
});
```

Best for timelines, feeds, and dashboards where perceived speed matters.

## Cache Limitations

Caching applies only to `GET` requests. `POST`, `PUT`, `PATCH`, and `DELETE` bypass the cache entirely.

If the Cache API is unavailable (for example on an insecure origin), caching is skipped and all requests go to the network.

Entries stored by the named strategies have no TTL. They stay until you delete them. When `expiry` or `ttl` is set, it takes precedence over `cache`.

Only `ok` responses are stored. Caches persist across sessions, so clear them on logout if responses contain user data.

## Cache Invalidation

### Clear Everything

```javascript
await api.cache.clear();
```

### Delete by Exact URL

```javascript
await api.cache.delete('https://api.example.com/products');
```

### Delete by Glob Pattern

```javascript
await api.cache.delete('*/user/*');
```

Glob patterns support `*` wildcards. The pattern is matched against both the full URL and the pathname.

## Direct Cache Access

For advanced use, access the cache manager directly. These methods do not apply prefixes, and a relative URL resolves against the page, so pass the resolved URL:

```javascript
const url = api.prefix.resolve('/products');

// Read
const cached = await api.cache.get(url);

// Write with TTL
await api.cache.set(url, response, 60000);

// Delete
await api.cache.delete(url);

// Purge all
await api.cache.clear();
```

## Cache Key

Cache keys are derived from the request URL after prefix resolution. Two requests to the same resolved URL share the same cache entry:

```javascript
api.prefix.add('default', 'https://api.example.com');

// Both resolve to the same key
api.get('/products');            // key: https://api.example.com/products
api.get('https://api.example.com/products'); // same key
```

The query string is part of the key. Request headers are not.
