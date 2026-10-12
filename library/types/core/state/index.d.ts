/**
 * types/core/state/index.d.ts
 *
 * TypeScript declarations for the reactive state management layer.
 */

export interface StoreOptions<T> {
  deep?: boolean;
  clone?: (state: T) => T;
}

export class ReactiveStore<T extends Record<string, any>> {
  constructor(initialState: T, options?: StoreOptions<T>);
  get<K extends keyof T>(key: K): T[K];
  set<K extends keyof T>(key: K, value: T[K], source?: string): void;
  subscribe<K extends keyof T>(
    key: K,
    callback: (val: T[K]) => void,
    signal?: AbortSignal
  ): () => void;
  onMutation(callback: (key: string, value: any, source: string) => void): () => void;
  batch(fn: () => void): void;
  snapshot(): T;
  hydrate(state: Partial<T>): void;
  reset(initialState: T): void;
  broadcast(channelName: string, keys?: string[]): () => void;
  derived<V>(keys: string[] | (() => V), compute?: () => V): DerivedValue<V>;
}

export interface DerivedValue<T> {
  readonly value: T;
  subscribe(callback: () => void): () => void;
  dispose(): void;
}

export function derived<T>(compute: () => T): DerivedValue<T>;

export function sync(
  store: ReactiveStore<any>,
  keys?: string[],
  channelName?: string
): () => void;

export class PlatformStorage {
  registerMigrations(migrations: Array<(db: IDBDatabase, tx: IDBTransaction) => void>): void;
  open(): Promise<IDBDatabase>;
  get(storeName: string, key: string): Promise<any>;
  set(storeName: string, key: string, value: any, options?: { ttl?: number }): Promise<void>;
  delete(storeName: string, key: string): Promise<void>;
  query(storeName: string, queryFn?: (item: any) => boolean): Promise<any[]>;
  estimate(): Promise<{ quota?: number; usage?: number }>;
  persist(): Promise<boolean>;
  isPersisted(): Promise<boolean>;
}

export const storage: PlatformStorage;

export const state: {
  create<T extends Record<string, any>>(initial: T, options?: StoreOptions<T>): ReactiveStore<T>;
  derived: typeof derived;
  sync: typeof sync;
  storage: PlatformStorage;
};

export function setActiveSubscriber(subscriber: Set<any> | null): void;
export function getActiveSubscriber(): Set<any> | null;

