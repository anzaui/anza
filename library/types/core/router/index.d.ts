/**
 * types/core/router/index.d.ts
 *
 * Strict TypeScript declarations for the Native Router runtime.
 */

import { Disposer } from '../ui/index.js';

export interface RouteRecord {
  patternStr: string;
  handler: unknown;
  meta: Record<string, unknown>;
  pattern: any;
}

export interface ChainSegment {
  route: RouteRecord;
  tag: string;
  params: Record<string, string>;
}

export interface MatchResult {
  route: RouteRecord;
  tag: string;
  params: Record<string, string>;
  query: Record<string, string>;
  hash: string;
  chain: ChainSegment[];
  result: any;
}

export interface NavigationResult {
  committed: Promise<any>;
  finished: Promise<any>;
}

export interface RouterEventPayloads {
  found: {
    tag: string;
    params: Record<string, string>;
    query: Record<string, string>;
    hash: string;
    chain: ChainSegment[];
    url: string;
    direction: string;
  };
  notfound: {
    url: string;
  };
  error: {
    error: Error;
    url: string | null;
    route: RouteRecord | null;
    phase: string;
  };
}

export type RouterGuard = (
  destination: any,
  controller: any
) => string | null | undefined | Promise<string | null | undefined>;

export interface GuardsApi {
  add(guardFn: RouterGuard): Disposer;
  clear(): void;
}

export interface MissApi {
  set(handler: (event: any) => any): Disposer;
  clear(): void;
}

export type PageFallback =
  | string
  | { tag: string; props?: Record<string, unknown> }
  | { html: string };

export interface PagesApi {
  configure(config: {
    notfound?: PageFallback;
    error?: PageFallback;
    offline?: PageFallback;
  }): Disposer;
  show(kind: 'notfound' | 'error' | 'offline', ctx?: Record<string, unknown>): Promise<void>;
  onError(handler: (ctx: Record<string, unknown>) => any): Disposer;
  suppressDefault(suppress?: boolean): void;
  notFound(handler: (event: any) => any): Disposer;
}

export interface SyncApi {
  start(r?: any): void;
  stop(): void;
  active(): boolean;
  close(): void;
}

export interface LinksApi {
  add(
    pattern: string,
    factory: (ctx: { url: URL; params: Record<string, string> }) => any
  ): Disposer;
  remove(pattern: string): void;
  clear(): void;
}

export type LoadingOverride =
  | false
  | string
  | { tag: string; props?: Record<string, unknown> }
  | { html: string }
  | { disabled: true };

export interface LoadingHandle {
  gen: number;
  host: Element | null;
  hostName: string | null;
  skipped: boolean;
}

export interface LoadingApi {
  /** App-level loading default (same shapes as dock/page `loading`). Returns a disposer. */
  configure(config?: LoadingOverride | { loading: LoadingOverride }): Disposer;
  show(via?: string[], pageTag?: string | null, direction?: string): Promise<LoadingHandle>;
  hide(host: Element | null, gen: number): void;
  clear(hostOrName: Element | string): void;
  ensureStyles(): void;
  replaceKeepingLoading(host: Element, ...nodes: Node[]): void;
}

/** Route asset cache (Cache API, TTL via x-expires-at). */
export interface RouteCacheApi {
  get(url: string): Promise<Response | null>;
  set(url: string, response: Response, ttl?: number): Promise<void>;
  prefetch(url: string, options?: { ttl?: number; signal?: AbortSignal }): Promise<Response | null>;
  /** Removes one URL, or the whole route cache when called without one. */
  purge(url?: string): Promise<void>;
}

export interface RouteDefinition {
  pattern: string;
  handler: unknown;
  meta?: Record<string, unknown>;
}

export type RouteTransformer = (match: MatchResult) => void;

export interface TransitionController {
  url: string;
  promise: Promise<any>;
  on<K extends keyof RouterEventPayloads>(
    event: K,
    callback: (payload: RouterEventPayloads[K]) => void
  ): this;
  on(event: 'error', callback: (error: Error) => void): this;
}

export interface RouterApi {
  register(patternStr: string, handler: unknown, meta?: Record<string, unknown>): void;
  load(routes: RouteDefinition | RouteDefinition[]): void;
  clear(): void;
  guard(fn: RouterGuard): Disposer;
  notFound(callback: (event: any) => void | Promise<void>): Disposer;
  transform(fn: RouteTransformer): Disposer;

  guards: GuardsApi;
  miss: MissApi;
  pages: PagesApi;
  loading: LoadingApi;
  links: LinksApi;
  sync: SyncApi;

  navigate(url: string, options?: { state?: any; info?: any; history?: 'push' | 'replace' }): NavigationResult;
  replace(url: string, options?: { state?: any; info?: any }): NavigationResult;
  back(): NavigationResult;
  forward(): NavigationResult;
  go(delta: number): NavigationResult;
  current(): any;
  entries(): any[];
  canBack(): boolean;
  canForward(): boolean;

  match(url: string | URL): Promise<MatchResult | null>;

  cache: RouteCacheApi;
  prefetch: RouteCacheApi['prefetch'];
  transitions: TransitionsApi;

  on<K extends keyof RouterEventPayloads>(
    type: K,
    callback: (payload: RouterEventPayloads[K]) => void,
    signal?: AbortSignal
  ): Disposer;

  nav: {
    to(url: string, options?: { state?: any; info?: any; history?: 'push' | 'replace' }): TransitionController;
  };

  registerConnection(
    pattern: string,
    factory: (ctx: { url: URL; params: Record<string, string> }) => any
  ): Disposer;
  getActiveConnections(): Map<string, any>;
  clearConnections(): void;

  registerContainer(name: string, element: Element, parent?: string | null, tag?: string | null): void;
  unregisterContainer(name: string): void;
  getContainer(name: string): Element | null;
  clearContainers(): void;
  hasContainer(name: string): boolean;

  setup(): void;
  destroy(): void;

  /** The `<dock-main id="main">` shell element, once captured. */
  shell(): Element | null;
  win(): Window;
}

export const router: RouterApi;

export function navigate(url: string, options?: { state?: any; info?: any; history?: 'push' | 'replace' }): NavigationResult;
export function replace(url: string, options?: { state?: any; info?: any }): NavigationResult;
export function back(): NavigationResult;
export function forward(): NavigationResult;
export function go(delta: number): NavigationResult;
export function current(): any;
export function entries(): any[];
export function canBack(): boolean;
export function canForward(): boolean;

export function register(patternStr: string, handler: unknown, meta?: Record<string, unknown>): void;
/** Bulk-registers `{ pattern, handler, meta }` records. */
export function load(routes: RouteDefinition | RouteDefinition[]): void;
export function match(url: string | URL): Promise<MatchResult | null>;
export function clear(): void;
export function getRoutes(): RouteRecord[];

export function addGuard(guardFn: RouterGuard): Disposer;
export function setNotFound(handler: (event: any) => any): Disposer;
/** Registers a transformer called with every successful match. */
export function transform(fn: RouteTransformer): Disposer;
export function setup(): void;
export function destroy(): void;
export function on<K extends keyof RouterEventPayloads>(
  type: K,
  callback: (payload: RouterEventPayloads[K]) => void,
  signal?: AbortSignal
): Disposer;
export const nav: {
  to(url: string, options?: { state?: any; info?: any; history?: 'push' | 'replace' }): TransitionController;
};

export const guardsApi: GuardsApi;
export const missApi: MissApi;
export const pagesApi: PagesApi;
export const loadingApi: LoadingApi;

export function setupTabSync(r?: any): void;
export function registerConnection(
  pattern: string,
  factory: (ctx: { url: URL; params: Record<string, string> }) => any
): Disposer;
export function getActiveConnections(): Map<string, any>;
export function clearConnections(): void;
export const links: LinksApi;

export function registerContainer(name: string, element: Element, parent?: string | null, tag?: string | null): void;
export function unregisterContainer(name: string): void;
export function getContainer(name: string): Element | null;
export function clearContainers(): void;
export function hasContainer(name: string): boolean;

export const cache: RouteCacheApi;
export function prefetch(url: string, options?: { ttl?: number; signal?: AbortSignal }): Promise<Response | null>;

/**
 * Holds the initial route match until `promise` settles. Gates added after
 * boot are ignored. Returns the same promise.
 */
export function gate<T>(promise: Promise<T>): Promise<T>;
/** True once the boot sequence has run the initial match. */
export function ready(): boolean;
/** Resets boot state (tests, teardown). */
export function reset(): void;

export interface TransitionsApi {
  configure: typeof import('../ui/index.js').configureTransitions;
  getConfig: typeof import('../ui/index.js').getTransitionConfig;
  prefersReducedMotion: typeof import('../ui/index.js').prefersReducedMotion;
  dockName: typeof import('../ui/index.js').dockTransitionName;
  runSwap: typeof import('../ui/index.js').runSwapTransition;
  /** Document view transition around a DOM update (shared-element morph via sourceElement/name). */
  run(
    updateDOM: () => void | Promise<void>,
    options?: {
      sourceElement?: Element;
      name?: string;
      signal?: AbortSignal;
      skip?: boolean;
      enabled?: boolean;
      direction?: string;
    }
  ): Promise<void>;
}

export const transitions: TransitionsApi;
