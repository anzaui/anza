# Cache

The router provides a route-level cache backed by the browser Cache API. Prefetch view assets on hover or visibility so navigation is instant.

## Prefetch

Fetch and cache a URL before the user navigates to it:

```javascript
import { router } from '@anzaui/anza/router';

// On link hover
link.addEventListener('mouseenter', () => {
  router.cache.prefetch('/reports');
});

// On section visibility
observer.observe(section, { callback: () => {
  router.cache.prefetch('/settings');
}});
```

Prefetch uses the Cache API with a 5-minute TTL. If the resource is already cached and not expired, it returns immediately.

## Cache Read and Write

Direct cache access:

```javascript
// Read
const response = await router.cache.get('/reports');

// Write
await router.cache.set('/reports', response, { ttl: 10 * 60 * 1000 }); // 10 minutes

// Purge one URL
await router.cache.purge('/reports');

// Purge everything
await router.cache.purge();
```

## TTL Convention

The cache stores an `x-expires-at` header on every response. When reading, expired entries are deleted automatically. The default TTL is 5 minutes.

## Graceful Degradation

When the Cache API is unavailable (private mode, quota exceeded, unsupported browser), all cache operations return `null` silently. Navigation continues normally.

## When to Prefetch

Good candidates:

- Links the user is likely to click (hover, focus)
- Sections that become visible in a scroll area
- Next steps in a linear flow (wizard, checkout)
- Routes whose data is expensive to fetch

Avoid prefetching:

- Routes behind authentication guards (the guard still runs)
- Large assets that would exhaust cache quota
- Routes the user is unlikely to visit
