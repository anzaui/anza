/**
 * src/sw/strategies.js
 *
 * Caching Strategies.
 * Implements standard service worker request interception strategies:
 * CacheFirst, NetworkFirst, StaleRevalidate, CacheThenNetwork, NetworkOnly, CacheOnly,
 * and OfflineFallback, featuring configurable timeouts and dynamic response TTLs.
 *
 * Source: doc 13 — Offline and Background §3
 */

/**
 * Returns a Response suitable for `cache.put` without locking the caller's body.
 * Always clones (or rebuilds from a clone) so strategies can still `return response`.
 */
async function cloneWithExpiry(response, ttl) {
  if (!ttl) return response.clone();

  // Read body as blob to prevent stream lockups
  const blob = await response.clone().blob();
  const headers = new Headers(response.headers);
  headers.set('x-expires-at', (Date.now() + ttl).toString());

  return new Response(blob, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

/**
 * Serves shell assets eagerly from cache; falls back to network on miss.
 */
export class CacheFirst {
  constructor(cacheName, options = {}) {
    this.cacheName = cacheName;
    this.options = options;
  }

  async handle(request) {
    const cache = await caches.open(this.cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      const expiresAt = parseInt(cachedResponse.headers.get('x-expires-at') ?? '0', 10);
      if (!expiresAt || expiresAt > Date.now()) {
        return cachedResponse.clone();
      }
    }

    try {
      const response = await fetch(request);
      if (response && response.ok && (request.method === 'GET' || request.method === 'HEAD')) {
        const storedRes = await cloneWithExpiry(response.clone(), this.options.ttl);
        await cache.put(request, storedRes);
      }
      return response.clone();
    } catch (err) {
      if (cachedResponse) return cachedResponse.clone();
      throw err;
    }
  }
}

/**
 * Consults network first; falls back to cache on failure or configurable timeout.
 */
export class NetworkFirst {
  constructor(cacheName, options = {}) {
    this.cacheName = cacheName;
    this.options = options;
    this.timeout = options.timeout ?? 4000; // default 4-second timeout
  }

  async handle(request) {
    const cache = await caches.open(this.cacheName);
    const cachedResponse = await cache.match(request);

    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => resolve(null), this.timeout);
    });

    try {
      const networkResponse = await Promise.race([
        fetch(request),
        timeoutPromise
      ]);

      if (networkResponse && networkResponse.ok && (request.method === 'GET' || request.method === 'HEAD')) {
        const storedRes = await cloneWithExpiry(networkResponse.clone(), this.options.ttl);
        await cache.put(request, storedRes);
        return networkResponse.clone();
      }
    } catch (err) {
      // Fall through to cache on direct network failure
    }

    if (cachedResponse) {
      return cachedResponse.clone();
    }

    // Global navigation fallback page check
    if (request.mode === 'navigate' && this.options.fallbackUrl) {
      const fallback = await caches.match(this.options.fallbackUrl);
      if (fallback) return fallback.clone();
    }

    throw new Error(`NetworkFirst: failed to fetch "${request.url}" and no cached copy was available.`);
  }
}

/**
 * Serves cache instantly, executing a parallel background revalidation.
 */
export class StaleRevalidate {
  constructor(cacheName, options = {}) {
    this.cacheName = cacheName;
    this.options = options;
  }

  async handle(request) {
    const cache = await caches.open(this.cacheName);
    const cachedResponse = await cache.match(request);

    const fetchPromise = (async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok && (request.method === 'GET' || request.method === 'HEAD')) {
          const storedRes = await cloneWithExpiry(response.clone(), this.options.ttl);
          await cache.put(request, storedRes);
        }
        return response.clone();
      } catch (err) {
        console.warn(`StaleRevalidate background fetch failed for "${request.url}":`, err);
        throw err;
      }
    })();

    if (cachedResponse) {
      // Catch error in background to prevent unhandled rejection crashes
      fetchPromise.catch(() => {});
      return cachedResponse.clone();
    }

    return fetchPromise;
  }
}

/**
 * Two-pass caching strategy. Returns cache instantly, background fetches the network update,
 * and posts the new payload to open window contexts via postMessage.
 */
export class CacheThenNetwork {
  constructor(cacheName, options = {}) {
    this.cacheName = cacheName;
    this.options = options;
  }

  async handle(request) {
    const cache = await caches.open(this.cacheName);
    const cachedResponse = await cache.match(request);

    const fetchPromise = (async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok && (request.method === 'GET' || request.method === 'HEAD')) {
          const storedRes = await cloneWithExpiry(response.clone(), this.options.ttl);
          await cache.put(request, storedRes);

          // Dispatch update event to all controlled clients
          const clientsList = await self.clients.matchAll();
          if (clientsList.length > 0) {
            let payload = null;
            const contentType = response.headers.get('content-type') ?? '';
            if (contentType.includes('application/json')) {
              try {
                payload = await storedRes.clone().json();
              } catch {}
            }

            for (const client of clientsList) {
              client.postMessage({
                type: 'cache-update',
                url: request.url,
                payload
              });
            }
          }
        }
        return response.clone();
      } catch (err) {
        console.warn(`CacheThenNetwork background fetch failed for "${request.url}":`, err);
        throw err;
      }
    })();

    if (cachedResponse) {
      fetchPromise.catch(() => {});
      return cachedResponse.clone();
    }

    return fetchPromise;
  }
}

/**
 * Bypasses caches, direct network execution.
 */
export class NetworkOnly {
  async handle(request) {
    return fetch(request);
  }
}

/**
 * Restricts queries purely to cache entries.
 */
export class CacheOnly {
  constructor(cacheName) {
    this.cacheName = cacheName;
  }

  async handle(request) {
    const cache = await caches.open(this.cacheName);
    const cachedResponse = await cache.match(request);
    if (!cachedResponse) {
      throw new Error(`CacheOnly: response for "${request.url}" not found in cache "${this.cacheName}"`);
    }
    return cachedResponse.clone();
  }
}

/**
 * Intercepts failing navigations, returning a pre-cached fallback webpage.
 */
export class OfflineFallback {
  constructor(fallbackUrl) {
    this.fallbackUrl = fallbackUrl;
  }

  async handle(request, error) {
    if (request.mode === 'navigate') {
      const fallback = await caches.match(this.fallbackUrl);
      if (fallback) return fallback.clone();
    }
    throw error || new Error('Request failed and offline fallback page was not available.');
  }
}
