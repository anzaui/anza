/**
 * src/core/offline/sync.js
 *
 * Background Sync Manager.
 * Registers Service Worker Background Sync descriptors for Chromium-based browsers,
 * falling back to custom window online-event triggers on Safari and Firefox.
 *
 * Source: doc 13 — Offline and Background §4
 */

import { queue } from './queue.js';
import { state } from './state.js';

export class SyncManager {
  constructor() {
    if (
      typeof navigator !== 'undefined' &&
      navigator.serviceWorker
    ) {
      navigator.serviceWorker.addEventListener('message', async (event) => {
        const data = event.data;
        if (data && (data.type === 'sync-success' || data.type === 'sync-failed')) {
          try {
            const list = await queue.list();
            state.set('pending', list.length);
          } catch (err) {
            console.error('Failed to sync pending task count on service worker message:', err);
          }
        }
      });
    }
  }

  /**
   * Registers a sync tag with the Service Worker Background Sync API, falling back
   * to manual online triggers if unsupported.
   */
  async register(tag) {
    if (
      typeof navigator !== 'undefined' &&
      navigator.serviceWorker
    ) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration.sync) {
          await registration.sync.register(tag);
          return true;
        }
      } catch (err) {
        console.warn('Background Sync registration failed; falling back to listener:', err);
      }
    }

    // Resilient fallback for Safari and Firefox
    if (typeof window !== 'undefined') {
      const trigger = () => {
        window.removeEventListener('online', trigger);
        // Dispatch a custom event detailing the pending tag
        const event = new CustomEvent('core:sync-fallback', { detail: { tag } });
        window.dispatchEvent(event);
      };

      window.addEventListener('online', trigger);
    }
    return false;
  }

  /**
   * Subscribes to manual sync fallback triggers (useful for executing queue replays on Safari/Firefox).
   */
  onSyncFallback(fn, signal) {
    if (signal?.aborted || typeof window === 'undefined') return () => {};

    const listener = async (event) => {
      // Coordinated fallback execution using Web Locks
      if (typeof navigator !== 'undefined' && navigator.locks) {
        try {
          await navigator.locks.request('offline:sync', async () => {
            await fn(event.detail.tag);
          });
        } catch (err) {
          console.error('Failed to execute fallback sync under Web Lock:', err);
        }
      } else {
        await fn(event.detail.tag);
      }
    };
    window.addEventListener('core:sync-fallback', listener);

    const dispose = () => {
      window.removeEventListener('core:sync-fallback', listener);
      if (signal) {
        signal.removeEventListener('abort', dispose);
      }
    };

    if (signal) {
      signal.addEventListener('abort', dispose, { once: true });
    }

    return dispose;
  }
}

export const sync = new SyncManager();

