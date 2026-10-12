/**
 * types/core/api/index.d.ts
 *
 * TypeScript declarations for the native-first networking layer.
 */

export class PlatformError extends Error {
  constructor(init: {
    code?: string;
    message: string;
    cause?: unknown;
    context?: Record<string, unknown>;
    recoverable?: boolean;
  });
  code?: string;
  cause?: unknown;
  context: Record<string, unknown>;
  recoverable: boolean;
}

export type CacheStrategy = 'cache-first' | 'network-first' | 'stale-while-revalidate';

export interface RequestDescriptor {
  requestId?: string;
  url: string;
  method: string;
  headers: Headers;
  body?: any;
  signal?: AbortSignal;
  priority?: 'high' | 'low' | 'auto' | 'user-blocking' | 'user-visible' | 'background';
  timeout?: number;
  cache?: CacheStrategy;
  retries?: number;
  [key: string]: unknown;
}

/** Per-request event handlers, scoped to this request and removed afterwards. */
export type RequestEventHandlers = Record<string, (event: CustomEvent) => void>;

export interface RequestOptions {
  headers?: Record<string, string> | Headers;
  signal?: AbortSignal;
  priority?: RequestDescriptor['priority'];
  timeout?: number;
  cache?: CacheStrategy;
  retries?: number;
  on?: RequestEventHandlers;
  [key: string]: unknown;
}

export type OutboundInterceptor = (
  desc: RequestDescriptor
) => RequestDescriptor | Response | void | Promise<RequestDescriptor | Response | void>;

export type InboundInterceptor = (
  responseOrError: Response | Error
) => Response | Error | Promise<Response | Error>;

export interface Pipeline {
  outbound(interceptor: OutboundInterceptor): this;
  inbound(interceptor: InboundInterceptor): this;
  run(desc: RequestDescriptor, executeFetch: (desc: RequestDescriptor) => Promise<Response>): Promise<Response>;
}

export const pipeline: Pipeline;

export function execute(desc: RequestDescriptor): Promise<Response>;

export interface RetryOptions {
  attempts?: number;
  /** Starting delay in ms (default 100). */
  base?: number;
  /** Maximum delay in ms (default 3000). */
  maxDelay?: number;
  signal?: AbortSignal;
}

export function retry<T>(operation: () => Promise<T>, options?: RetryOptions): Promise<T>;

/** TransformStream that turns text chunks into parsed NDJSON values. */
export function createNDJSONTransform(): TransformStream<string, any>;

/** Streams a newline-delimited JSON body, yielding each parsed line. */
export function stream<T = any>(
  url: string,
  opts?: RequestInit & { on?: RequestEventHandlers; requestId?: string }
): AsyncGenerator<T, void, unknown>;

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/** XHR upload with progress. Resolves with the parsed response body. */
export function upload(
  url: string,
  fileOrData: XMLHttpRequestBodyInit | Document,
  opts?: {
    method?: string;
    headers?: Record<string, string>;
    onProgress?: (progress: UploadProgress) => void;
    signal?: AbortSignal;
    on?: RequestEventHandlers;
    requestId?: string;
  }
): Promise<any>;

export interface PrefixRegistry {
  add(name: string, value: string): void;
  clear(): void;
  resolve(url: string): string;
}

export const prefixes: PrefixRegistry;

export interface ApiEventEmitter {
  on(event: string, handler: (event: CustomEvent) => void, signal?: AbortSignal): () => void;
  emit(event: string, detail?: any): void;
}

export const events: ApiEventEmitter;

export interface ApiCache {
  readonly name: string;
  open(): Promise<Cache>;
  get(request: string | Request): Promise<Response | null>;
  set(request: string | Request, response: Response, ttlMs?: number): Promise<void>;
  /** Exact URL or glob pattern (`/api/users/*`). */
  delete(pattern: string): Promise<void>;
  clear(): Promise<void>;
}

/** The API response cache (Cache API, TTL via x-expires-at). */
export const cache: ApiCache;

/** Re-reads the `#anza-state` JSON script injected by SSG/SSR. */
export function sync(): void;

export const api: {
  get(url: string, opts?: RequestOptions): Promise<any>;
  post(url: string, body?: any, opts?: RequestOptions): Promise<any>;
  put(url: string, body?: any, opts?: RequestOptions): Promise<any>;
  patch(url: string, body?: any, opts?: RequestOptions): Promise<any>;
  delete(url: string, opts?: RequestOptions): Promise<any>;
  /** Route state embedded by SSG/SSR (`#anza-state` → `__route`). */
  state(): Record<string, any>;
  sync: typeof sync;
  stream: typeof stream;
  upload: typeof upload;
  pipeline: Pipeline;
  PlatformError: typeof PlatformError;
  prefix: PrefixRegistry;
  cache: ApiCache;
  on(event: string, handler: (event: CustomEvent) => void, signal?: AbortSignal): () => void;
  emit(event: string, detail?: any): void;
};
