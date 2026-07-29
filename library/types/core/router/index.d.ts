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
  clear(): void;
  guard(fn: RouterGuard): Disposer;
  notFound(callback: (event: any) => void | Promise<void>): Disposer;

  guards: GuardsApi;
  miss: MissApi;
  pages: PagesApi;
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

  registerContainer(name: string, element: Element): void;
  unregisterContainer(name: string): void;
  getContainer(name: string): Element | null;
  clearContainers(): void;

  setup(): void;
  destroy(): void;
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
export function match(url: string | URL): Promise<MatchResult | null>;
export function clear(): void;
export function getRoutes(): RouteRecord[];

export function addGuard(guardFn: RouterGuard): Disposer;
export function setNotFound(handler: (event: any) => any): Disposer;
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

export function setupTabSync(r?: any): void;
export function registerConnection(
  pattern: string,
  factory: (ctx: { url: URL; params: Record<string, string> }) => any
): Disposer;
export function getActiveConnections(): Map<string, any>;
export function clearConnections(): void;
export const links: LinksApi;

export function registerContainer(name: string, element: Element): void;
export function unregisterContainer(name: string): void;
export function getContainer(name: string): Element | null;
export function clearContainers(): void;

export interface TransitionsApi {
  run(
    updateDOM: () => void | Promise<void>,
    options?: { sourceElement?: HTMLElement; name?: string }
  ): Promise<void>;
}

export const transitions: TransitionsApi;

export class RouteOutlet extends HTMLElement {
  update(detail: { chain: ChainSegment[]; query: Record<string, string>; hash: string }): Promise<void>;
}

declare global {
  interface HTMLElementTagNameMap {
    'route-outlet': RouteOutlet;
  }
}
