/**
 * src/sw/routes.js
 *
 * Service Worker Pattern Router.
 * Implements URLPattern matching, intercepting incoming SW fetch events
 * and routing them to their declared caching strategy synchronously.
 *
 * Source: doc 09 — Routing §3, doc 13 — Offline and Background §3
 */

/**
 * Normalizes an input pattern descriptor into a standard URLPattern instance.
 * Falls back to a minimal matcher when URLPattern is missing or rejects the
 * pattern (avoids SW script-evaluation failures under subpath hosts).
 *
 * Critical: never evaluate `instanceof URLPattern` when the constructor is
 * undefined — that throws during SW module evaluation (Firefox without
 * URLPattern in ServiceWorkerGlobalScope) and aborts registration entirely.
 */
function normalize(pattern) {
  const hasURLPattern = typeof URLPattern !== 'undefined';

  if (hasURLPattern && pattern instanceof URLPattern) {
    return pattern;
  }

  const pathname =
    typeof pattern === 'string'
      ? (pattern === '*' || pattern === '/*' ? '*' : pattern)
      : (pattern && typeof pattern === 'object' ? pattern : { pathname: '*' });

  const pathStr = typeof pathname === 'string' ? pathname : pathname?.pathname || '*';

  // Catch-all patterns vary across URLPattern implementations; use the
  // portable matcher so `r.register('*', …)` never throws at SW eval time.
  if (!hasURLPattern || pathStr === '*' || pathStr === '/*') {
    return createFallbackMatcher(pathStr);
  }

  try {
    if (typeof pathname === 'string') {
      return new URLPattern({ pathname });
    }
    return new URLPattern(pathname);
  } catch (err) {
    console.error('[anza/sw] Invalid route pattern; using fallback matcher:', pattern, err);
    return createFallbackMatcher(pathStr);
  }
}

/** Minimal pathname matcher used when native URLPattern cannot be constructed. */
function createFallbackMatcher(pathnamePattern) {
  const matchAll = !pathnamePattern || pathnamePattern === '*' || pathnamePattern === '/*';
  let regex;
  if (matchAll) {
    regex = /^/;
  } else {
    const escaped = String(pathnamePattern)
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*');
    regex = new RegExp(`^${escaped}$`);
  }
  return {
    test(url) {
      try {
        return regex.test(new URL(url).pathname);
      } catch {
        return false;
      }
    }
  };
}

export class Router {
  constructor() {
    this.routes = [];
  }

  /**
   * Registers a URLPattern and a matching caching strategy.
   */
  register(pattern, strategy) {
    this.routes.push({
      pattern: normalize(pattern),
      strategy
    });
  }

  /**
   * Handles an incoming fetch event, matching registered patterns sequentially
   * and intercepting matches.
   */
  handle(event) {
    const { request } = event;

    for (const route of this.routes) {
      if (route.pattern.test(request.url)) {
        // Intercept synchronously in fetch event tick
        event.respondWith(route.strategy.handle(request));
        return true;
      }
    }

    return false;
  }
}

/**
 * Factory wrapper to construct a Router instance.
 */
export function router() {
  return new Router();
}
