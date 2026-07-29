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
