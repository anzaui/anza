/**
 * src/sw/strategies.js
 *
 * Caching Strategies.
 * Implements standard service worker request interception strategies:
 * CacheFirst, NetworkFirst, StaleRevalidate, CacheThenNetwork, NetworkOnly, CacheOnly,
 * and OfflineFallback, featuring configurable timeouts and dynamic response TTLs.
 *
 * Every strategy responds first and writes the cache afterwards. When the
 * router passes the FetchEvent as the second argument, the cache write is
 * handed to `event.waitUntil` so the worker stays alive until it finishes.
 *
 * Source: doc 13 — Offline and Background §3
 */

import { isStreamRequest } from './routes.js';

/** True when `value` looks like an ExtendableEvent (has `waitUntil`). */
function isEvent(value) {
  return !!value && typeof value.waitUntil === 'function';
}

/** Keeps the worker alive for `promise` when an event is available; never rejects. */
function waitFor(event, promise, label) {
  const settled = promise.catch((err) => {
    console.warn(`[anza/sw] ${label} failed:`, err);
  });
  if (isEvent(event)) {
    try {
      event.waitUntil(settled);
    } catch {
      // Event already finished; the promise still runs.
    }
  }
  return settled;
}

/** True when `url` is on a different origin from the worker. */
function crossOrigin(url) {
  try {
    return new URL(url).origin !== self.location.origin;
  } catch {
    return true;
  }
}

/**
 * Only successful GET responses that are safe to share go into the Cache
 * API. Skipped: `Cache-Control: no-store` or `private`, `Vary: *`, requests
 * carrying an `Authorization` header, and credentialed cross-origin requests.
 * Cached entries outlive a logout, so per-user data must never land there.
 */
function storable(request, response) {
  if (request.method !== 'GET' || !response || !response.ok) return false;
  if (request.headers?.has?.('authorization')) return false;
  if (request.credentials === 'include' && crossOrigin(request.url)) return false;
  const cacheControl = (response.headers.get('cache-control') || '').toLowerCase();
  if (/(^|[\s,])(no-store|private)(\s*($|[,=]))/.test(cacheControl)) return false;
  const vary = response.headers.get('vary') || '';
  if (vary.split(',').some((v) => v.trim() === '*')) return false;
  return true;
}

/**
 * Copy of `response` for `cache.put`. With a TTL the expiry goes into an
 * `x-expires-at` header on a Response that wraps the clone's body stream,
 * so the body is never buffered in memory.
 */
function forCache(response, ttl) {
  const copy = response.clone();
  if (!ttl) return copy;
  const headers = new Headers(copy.headers);
  headers.set('x-expires-at', String(Date.now() + ttl));
  return new Response(copy.body, {
    status: copy.status,
    statusText: copy.statusText,
    headers
  });
}

/** False once a cached entry's `x-expires-at` has passed. */
function fresh(response) {
  const expiresAt = parseInt(response.headers.get('x-expires-at') ?? '0', 10);
  return !expiresAt || expiresAt > Date.now();
}

/**
 * Fetches `request` and, once the response is in hand, stores a copy in
 * `cache` in the background (via `event.waitUntil` when given). Resolves with
 * the network response without waiting for the cache write.
 */
function fetchAndStore(request, cache, ttl, event) {
  let stored = Promise.resolve();
  const network = fetch(request).then((response) => {
    if (storable(request, response)) {
      stored = cache.put(request, forCache(response, ttl));
    }
    return response;
  });
  waitFor(event, network.then(() => stored, () => {}), `cache.put for "${request.url}"`);
  return network;
}

/**
 * Serves from cache; falls back to network on a miss or an expired entry.
 */
export class CacheFirst {
  constructor(cacheName, options = {}) {
    this.cacheName = cacheName;
    this.options = options;
  }

  async handle(request, event) {
    if (isStreamRequest(request)) return fetch(request);
    const cache = await caches.open(this.cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse && fresh(cachedResponse)) {
      return cachedResponse;
    }

    try {
      return await fetchAndStore(request, cache, this.options.ttl, event);
    } catch (err) {
      if (cachedResponse) return cachedResponse;
      throw err;
    }
  }
}

const TIMED_OUT = Symbol('timeout');

/**
 * Consults network first; falls back to cache on failure or configurable timeout.
 */
export class NetworkFirst {
  constructor(cacheName, options = {}) {
    this.cacheName = cacheName;
    this.options = options;
    this.timeout = options.timeout ?? 4000; // default 4-second timeout
  }

  async handle(request, event) {
    if (isStreamRequest(request)) return fetch(request);
    const cache = await caches.open(this.cacheName);
    const network = fetchAndStore(request, cache, this.options.ttl, event);

    let timer;
    const timeout = new Promise((resolve) => {
      timer = setTimeout(() => resolve(TIMED_OUT), this.timeout);
    });

    let result = null;
    try {
      result = await Promise.race([network, timeout]);
    } catch {
      // Direct network failure: fall through to the cache.
    } finally {
      clearTimeout(timer);
    }

    if (result && result !== TIMED_OUT && result.ok) return result;

    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      if (result === TIMED_OUT) network.catch(() => {});
      return cachedResponse;
    }

    // Slow network and nothing cached: keep waiting for the network.
    if (result === TIMED_OUT) {
      try {
        return await network;
      } catch {
        // Fall through to the navigation fallback.
      }
    } else if (result) {
      // Non-OK network response and nothing cached: pass it through.
      return result;
    }

    // Global navigation fallback page check
    if (request.mode === 'navigate' && this.options.fallbackUrl) {
      const fallback = await caches.match(this.options.fallbackUrl);
      if (fallback) return fallback;
    }

    throw new Error(`NetworkFirst: failed to fetch "${request.url}" and no cached copy was available.`);
  }
}

/**
 * Serves cache instantly and revalidates in the background.
 */
export class StaleRevalidate {
  constructor(cacheName, options = {}) {
    this.cacheName = cacheName;
    this.options = options;
  }

  async handle(request, event) {
    if (isStreamRequest(request)) return fetch(request);
    const cache = await caches.open(this.cacheName);
    const cachedResponse = await cache.match(request);
    const network = fetchAndStore(request, cache, this.options.ttl, event);

    if (cachedResponse) {
      network.catch((err) => {
        console.warn(`StaleRevalidate background fetch failed for "${request.url}":`, err);
      });
      return cachedResponse;
    }

    return network;
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

  async handle(request, event) {
    if (isStreamRequest(request)) return fetch(request);
    const cache = await caches.open(this.cacheName);
    const cachedResponse = await cache.match(request);
    const network = fetchAndStore(request, cache, this.options.ttl, event);

    const notify = network.then(async (response) => {
      if (!response || !response.ok) return;
      const isJson = (response.headers.get('content-type') ?? '').includes('application/json');
      // Clone synchronously, before the caller can consume the body.
      const copy = isJson ? response.clone() : null;

      const clientsList = self.clients ? await self.clients.matchAll() : [];
      if (clientsList.length === 0) return;

      let payload = null;
      if (copy) {
        try {
          payload = await copy.json();
        } catch {}
      }
      for (const client of clientsList) {
        client.postMessage({ type: 'cache-update', url: request.url, payload });
      }
    }, () => {});
    waitFor(event, notify, `CacheThenNetwork update for "${request.url}"`);

    if (cachedResponse) {
      network.catch(() => {});
      return cachedResponse;
    }

    return network;
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
    if (isStreamRequest(request)) return fetch(request);
    const cache = await caches.open(this.cacheName);
    const cachedResponse = await cache.match(request);
    if (!cachedResponse) {
      throw new Error(`CacheOnly: response for "${request.url}" not found in cache "${this.cacheName}"`);
    }
    return cachedResponse;
  }
}

/**
 * Intercepts failing navigations, returning a pre-cached fallback webpage.
 * The second argument is the original error; a FetchEvent passed by the
 * router in that position is ignored.
 */
export class OfflineFallback {
  constructor(fallbackUrl) {
    this.fallbackUrl = fallbackUrl;
  }

  async handle(request, error) {
    if (request.mode === 'navigate') {
      const fallback = await caches.match(this.fallbackUrl);
      if (fallback) return fallback;
    }
    throw (isEvent(error) ? null : error) || new Error('Request failed and offline fallback page was not available.');
  }
}
