/**
 * types/core/storage/index.d.ts
 *
 * TypeScript declarations for the unified storage gateway.
 */

export interface StorageQuotaEstimate {
  quota: number;
  usage: number;
  persisted: boolean;
}

export type StorageTier = 'memory' | 'idb' | 'opfs' | 'cache';

export type StorageTierOrOptions =
  | StorageTier
  | { tier?: StorageTier; ttl?: number | null };

export interface StorageConfigureOptions {
  idb?: {
    name?: string;
    version?: number;
    migrations?: Array<(db: IDBDatabase) => void>;
  };
  lru?: { maxSize?: number };
  cache?: { name?: string };
}

export const storage: {
  compressionThreshold: number;
  configure(options?: StorageConfigureOptions): typeof storage;
  get(key: string, tierOrOptions?: StorageTierOrOptions): Promise<any>;
  set(key: string, value: any, tierOrOptions?: StorageTierOrOptions): Promise<void>;
  delete(key: string, tierOrOptions?: StorageTierOrOptions): Promise<void>;
  query(
    storeName: string,
    queryOpts?: {
      index?: string;
      range?: IDBKeyRange;
      direction?: IDBCursorDirection;
      limit?: number;
    }
  ): Promise<any[]>;
  list(tier?: StorageTier): Promise<string[]>;
  clear(tier?: 'all' | StorageTier): Promise<void>;
  estimate(): Promise<StorageQuotaEstimate>;
  persist(): Promise<boolean>;
  persisted(): Promise<boolean>;
  transaction(
    storeNames: string | string[],
    mode: 'readonly' | 'readwrite',
    callback: (store: (name: string) => IDBObjectStore, tx: IDBTransaction) => any
  ): Promise<any>;
  onQuotaWarning(handler: (estimate: { usage: number; quota: number }) => void): () => void;
};

export interface IdbQueryOptions {
  index?: string;
  range?: IDBKeyRange;
  direction?: IDBCursorDirection;
  limit?: number;
}

/** Promise wrapper over one IndexedDB database with versioned migrations. */
export class Database {
  constructor(name: string, version: number, migrations?: Array<(db: IDBDatabase, tx?: IDBTransaction) => void>);
  open(): Promise<IDBDatabase>;
  close(): void;
  transaction<T = any>(
    storeNames: string | string[],
    mode: IDBTransactionMode,
    callback: (store: (name: string) => IDBObjectStore, tx: IDBTransaction) => T | Promise<T>
  ): Promise<T>;
  get<T = any>(storeName: string, key: IDBValidKey): Promise<T | null>;
  set(storeName: string, key: IDBValidKey, value: any): Promise<void>;
  delete(storeName: string, key: IDBValidKey): Promise<void>;
  clear(storeName: string): Promise<void>;
  getAll<T = any>(storeName: string): Promise<T[]>;
  keys(storeName: string): Promise<IDBValidKey[]>;
  query<T = any>(storeName: string, options?: IdbQueryOptions): Promise<T[]>;
}

/** Map-backed LRU with optional per-entry TTL (ms). `get` returns null on miss. */
export class LRUCache<K = any, V = any> {
  constructor(maxSize?: number);
  get(key: K): V | null;
  set(key: K, value: V, ttlMs?: number): void;
  delete(key: K): boolean;
  clear(): void;
}

/** LRU that holds values through WeakRefs (values must be objects). */
export class WeakLRUCache<K = any, V extends object = object> {
  constructor(maxSize?: number);
  get(key: K): V | null;
  set(key: K, value: V, ttlMs?: number): void;
  delete(key: K): boolean;
  clear(): void;
}

export interface QuotaManager {
  /** Registers a listener called when usage passes 80%. Returns a disposer. */
  onQuotaWarning(handler: (estimate: { usage: number; quota: number }) => void): () => void;
  /** `navigator.storage.estimate()`, or `{ usage: 0, quota: 0 }` when unavailable. */
  estimate(): Promise<{ usage: number; quota: number }>;
  /** Requests persistent storage; false when unsupported or denied. */
  persist(): Promise<boolean>;
  /** True (and listeners notified) when usage exceeds 80% of quota. */
  check(onEvictionWarning?: (estimate: { usage: number; quota: number }) => void): Promise<boolean>;
}

export const quota: QuotaManager;
