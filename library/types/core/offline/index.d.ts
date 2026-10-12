/**
 * types/core/offline/index.d.ts
 *
 * TypeScript declarations for offline synchronization and background operations.
 */

import { ReactiveStore } from '../state';

export interface OfflineTask {
  id: string;
  task: string;
  payload: any;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

export interface OfflineQueue {
  push(taskName: string, payload?: any, options?: { idempotencyKey?: string; maxRetries?: number }): Promise<string>;
  list(): Promise<OfflineTask[]>;
  update(task: OfflineTask): Promise<void>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}

export const queue: OfflineQueue;

export function check(force?: boolean): Promise<boolean>;
export function subscribe(fn: (isOnline: boolean) => void, signal?: AbortSignal): () => void;

export const sync: {
  register(tag: string): Promise<void>;
};

export const bridge: {
  send(task: string, payload?: any): Promise<any>;
  onMessage(fn: (msg: any) => void): () => void;
};

export interface OfflineState {
  online: boolean;
  status: 'online' | 'offline' | 'unknown';
  pending: number;
}

export const state: ReactiveStore<OfflineState>;

export interface ClockStamp {
  actor: string;
  clock: number;
}

export const clock: {
  actor(): Promise<string>;
  tick(): Promise<number>;
  sync(remoteTime: number): Promise<number>;
  stamp(): Promise<ClockStamp>;
};

export const offline: {
  check: typeof check;
  subscribe: typeof subscribe;
  queue: OfflineQueue;
  sync: typeof sync;
  state: ReactiveStore<OfflineState>;
  clock: typeof clock;
  send(task: string, payload?: any): Promise<any>;
};
