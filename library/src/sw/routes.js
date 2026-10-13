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
  // A pattern that names an origin must only ever match that origin, even
  // when its pathname is a catch-all handled by the portable matcher.
  const origin = hasExplicitOrigin(pattern) ? originMatcher(pattern) : null;

  // Catch-all patterns vary across URLPattern implementations; use the
  // portable matcher so `r.register('*', …)` never throws at SW eval time.
  if (!hasURLPattern || pathStr === '*' || pathStr === '/*') {
    return createFallbackMatcher(pathStr, origin);
  }

  try {
    if (typeof pathname === 'string') {
      return new URLPattern({ pathname });
    }
    return new URLPattern(pathname);
  } catch (err) {
    console.error('[anza/sw] Invalid route pattern; using fallback matcher:', pattern, err);
    return createFallbackMatcher(pathStr, origin);
  }
}

/** Anchored regex for a URLPattern-style component where `*` is a wildcard. */
function wildcard(value) {
  const escaped = String(value)
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`);
}

/**
 * Origin test for a pattern that names its origin (`baseURL` and/or a
 * concrete protocol, hostname or port). Every named component must match
 * exactly (`*` is a wildcard); a `baseURL` pins all three.
 */
function originMatcher(pattern) {
  const parts = {};
  if (typeof pattern.baseURL === 'string') {
    try {
      const base = new URL(pattern.baseURL);
      parts.protocol = base.protocol.replace(/:$/, '');
      parts.hostname = base.hostname;
      parts.port = base.port;
    } catch {
      return () => false;
    }
  }
  for (const key of ['protocol', 'hostname', 'port']) {
    const value = pattern[key];
    if (typeof value === 'string' && value !== '') parts[key] = value;
  }
  const checks = Object.entries(parts)
    .filter(([, value]) => value !== '*')
    .map(([key, value]) => [key, wildcard(value)]);
  return (url) => checks.every(([key, re]) => {
    const actual = key === 'protocol' ? url.protocol.replace(/:$/, '') : url[key];
    return re.test(actual);
  });
}

/**
 * Minimal pathname matcher used when native URLPattern cannot be constructed.
 * `origin`, when given, must also accept the URL.
 */
function createFallbackMatcher(pathnamePattern, origin = null) {
  const matchAll = !pathnamePattern || pathnamePattern === '*' || pathnamePattern === '/*';
  const regex = matchAll ? /^/ : wildcard(pathnamePattern);
  return {
    test(url) {
      try {
        const parsed = new URL(url);
        if (origin && !origin(parsed)) return false;
        return regex.test(parsed.pathname);
      } catch {
        return false;
      }
    }
  };
}

/**
 * Specificity score for a route pattern. Catch-alls score -1; any other
 * pattern scores the length of its literal pathname (wildcards and named
 * groups stripped), so `/api/*` beats `*` and `/api/v2/*` beats `/api/*`.
 */
function specificity(pattern) {
  let path = '*';
  if (typeof pattern === 'string') path = pattern;
  else if (pattern && typeof pattern.pathname === 'string') path = pattern.pathname;
  if (path === '*' || path === '/*' || path === '') return -1;
  return path.replace(/:[A-Za-z0-9_]+(\([^)]*\))?|[*?+()]/g, '').length;
}

/**
 * Requests the SW must never intercept: Server-Sent Event streams (the body
 * never ends, so caching one hangs) and the dev server's `/hmr` channel.
 */
export function isStreamRequest(request) {
  try {
    const accept = request?.headers?.get?.('accept') || '';
    if (accept.includes('text/event-stream')) return true;
    return new URL(request.url).pathname.endsWith('/hmr');
  } catch {
    return false;
  }
}

/**
 * True when a route pattern names its own origin: a URLPattern (or init
 * object) with a concrete protocol, hostname or port, or a `baseURL`.
 * Every other pattern only matches requests to the worker's own origin.
 */
function hasExplicitOrigin(pattern) {
  if (!pattern || typeof pattern !== 'object') return false;
  if (typeof pattern.baseURL === 'string') return true;
  return ['protocol', 'hostname', 'port'].some((key) => {
    const value = pattern[key];
    return typeof value === 'string' && value !== '*' && value !== '';
  });
}

/** Origin of the current worker (or window, in tests); null when unknown. */
function ownOrigin() {
  try {
    return self.location.origin;
  } catch {
    return null;
  }
}

/** True when `url` is on the worker's own origin. */
function sameOrigin(url) {
  const origin = ownOrigin();
  if (!origin) return true;
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
}

export class Router {
  constructor() {
    this.routes = [];
    this._sorted = true;
  }

  /**
   * Registers a URLPattern and a matching caching strategy. When several
   * patterns match, the most specific one wins (ties keep registration order).
   * Patterns without an explicit protocol/hostname/port only match requests
   * to the worker's own origin.
   */
  register(pattern, strategy) {
    this.routes.push({
      pattern: normalize(pattern),
      anyOrigin: hasExplicitOrigin(pattern),
      strategy,
      score: specificity(pattern),
      order: this.routes.length
    });
    this._sorted = false;
  }

  /**
   * Handles an incoming fetch event, intercepting it with the strategy of the
   * most specific matching route. Event streams and `/hmr` are never handled.
   */
  handle(event) {
    const { request } = event;
    const method = request?.method || 'GET';
    if (method !== 'GET' && method !== 'HEAD') {
      return false;
    }
    if (isStreamRequest(request)) {
      return false;
    }

    if (!this._sorted) {
      this.routes.sort((a, b) => b.score - a.score || a.order - b.order);
      this._sorted = true;
    }

    const local = sameOrigin(request.url);

    for (const route of this.routes) {
      if (!local && !route.anyOrigin) continue;
      if (route.pattern.test(request.url)) {
        // Intercept synchronously in fetch event tick with safe network fallback
        event.respondWith(
          Promise.resolve()
            .then(() => route.strategy.handle(request, event))
            .catch((err) => {
              console.warn('[anza/sw] Strategy execution failed for', request.url, err);
              return fetch(request);
            })
        );
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
