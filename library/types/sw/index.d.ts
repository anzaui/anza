/**
 * types/sw/index.d.ts
 *
 * Types for `@anzaui/anza/sw`: service worker caching strategies, a pattern
 * router, cache expiry, install/activate helpers, background sync replay and
 * push. Import it from your service worker module.
 */

/** Minimal fetch event shape (avoids requiring the WebWorker lib). */
export interface FetchEventLike {
  readonly request: Request;
  respondWith(response: Response | Promise<Response>): void;
  waitUntil(promise: Promise<unknown>): void;
}

/**
 * A strategy responds first; when `event` is given, background cache writes
 * are passed to `event.waitUntil()`.
 */
export interface Strategy {
  handle(request: Request, event?: FetchEventLike): Response | Promise<Response>;
}

export interface StrategyOptions {
  /** Entry lifetime in ms (stored as an x-expires-at header). */
  ttl?: number;
}

export class CacheFirst implements Strategy {
  constructor(cacheName: string, options?: StrategyOptions);
  handle(request: Request, event?: FetchEventLike): Promise<Response>;
}

export class NetworkFirst implements Strategy {
  constructor(cacheName: string, options?: StrategyOptions & {
    /** Network timeout before falling back to the cache (default 4000 ms). */
    timeout?: number;
    /** Cached page served for failed navigations. */
    fallbackUrl?: string;
  });
  handle(request: Request, event?: FetchEventLike): Promise<Response>;
}

export class StaleRevalidate implements Strategy {
  constructor(cacheName: string, options?: StrategyOptions);
  handle(request: Request, event?: FetchEventLike): Promise<Response>;
}

export class CacheThenNetwork implements Strategy {
  constructor(cacheName: string, options?: StrategyOptions);
  handle(request: Request, event?: FetchEventLike): Promise<Response>;
}

export class NetworkOnly implements Strategy {
  handle(request: Request, event?: FetchEventLike): Promise<Response>;
}

export class CacheOnly implements Strategy {
  constructor(cacheName: string);
  handle(request: Request, event?: FetchEventLike): Promise<Response>;
}

export class OfflineFallback implements Strategy {
  constructor(fallbackUrl: string);
  handle(request: Request, error?: unknown): Promise<Response>;
}

/** Pattern: pathname string (`'/api/*'`), URLPattern init, or `'*'`. */
export type RoutePattern = string | URLPatternInit;

export class Router {
  constructor();
  /**
   * Registers a pattern and its strategy. When several routes match, the most
   * specific wins (catch-alls lowest, then by literal path length; ties keep
   * registration order).
   */
  register(pattern: RoutePattern, strategy: Strategy): void;
  /**
   * Responds to GET/HEAD fetch events that match a route and passes the event
   * to the strategy. Event streams and `/hmr` are never handled. Returns true
   * if handled.
   */
  handle(event: FetchEventLike): boolean;
}

export function router(): Router;

export interface SerializedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
}

export function serializeRequest(request: Request): Promise<SerializedRequest>;
export function deserializeRequest(serialized: SerializedRequest): Request;

/** Deletes expired entries (x-expires-at) from a cache. */
export function pruneExpired(cacheName: string): Promise<void>;
/** Prunes on an interval (default 60 s); returns the interval id, or null. */
export function setupAutoPrune(cacheName: string, intervalMs?: number): ReturnType<typeof setInterval> | null;

export function precache(cacheName: string, urls: string[]): Promise<void>;
export function prefetchFallback(fallbackUrl: string): Promise<void>;

/** Deletes every cache except `currentCacheName` and the offline fallback cache. */
export function pruneStale(currentCacheName: string): Promise<void>;
export function claim(): Promise<void>;
export function enableNavPreload(registration?: ServiceWorkerRegistration): Promise<void>;

/** Replays queued offline requests (Background Sync). */
export function replayQueue(): Promise<void>;
export function requeueFailed(entry: Record<string, any>, error?: Error): Promise<void>;

export function subscribe(registration: ServiceWorkerRegistration | null | undefined, vapidKey: string | BufferSource): Promise<PushSubscription>;
export function notify(title: string, options?: NotificationOptions, registration?: ServiceWorkerRegistration): Promise<void>;
