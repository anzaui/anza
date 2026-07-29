/**
 * src/core/offline/connectivity.js
 *
 * Resilient Connectivity Monitor.
 * Extends the unreliable navigator.onLine by performing debounced, rate-limited
 * HTTP HEAD probes to verify genuine external internet access.
 *
 * Source: doc 13 — Offline and Background §4
 */

import { state } from './state.js';
import { bus } from '../events/bus.js';
import { names } from '../events/types/index.js';
import { withBase } from '../router/base.js';

let lastCheck = 0;
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
let inFlightProbe = null;

const listeners = new Set();

/**
 * Triggers a network connectivity check. Shares in-flight requests and throttles checks
 * to no more than once per 10 seconds.
 */
export async function check(force = false) {
  if (typeof window === 'undefined') return true;

  const now = Date.now();
  // Return cached state if requested within the 10-second limit and not forced
  if (!force && now - lastCheck < 10000) {
    return isOnline;
  }

  if (inFlightProbe) return inFlightProbe;

  inFlightProbe = (async () => {
    lastCheck = now;
    try {
      // Dispatch HEAD request with cache-busting parameter to verify external access
      await fetch(`${withBase('/favicon.ico')}?_probe=${now}`, {
        method: 'HEAD',
        cache: 'no-store',
        mode: 'no-cors' // Prevents CORS blockages
      });
      isOnline = true;
    } catch (err) {
      // Network failures or offline state trigger failure
      isOnline = false;
    } finally {
      inFlightProbe = null;
      // Sync reactive state
      state.set('online', isOnline);
      state.set('status', isOnline ? 'online' : 'offline');

      // Emit standardized connectivity event on the global bus
      bus.emit(isOnline ? names.connectivity.online : names.connectivity.offline, { online: isOnline });

      // Broadcast state to all active subscribers
      for (const listener of listeners) {
        try {
          listener(isOnline);
        } catch (err) {
          console.error('Error in connectivity listener:', err);
        }
      }
    }
    return isOnline;
  })();

  return inFlightProbe;
}

/**
 * Subscribes to connectivity changes.
 */
export function subscribe(fn, signal) {
  if (signal?.aborted) return () => {};

  listeners.add(fn);

  // Eagerly feed current status to the subscriber
  fn(isOnline);

  const dispose = () => {
    listeners.delete(fn);
    if (signal) {
      signal.removeEventListener('abort', dispose);
    }
  };

  if (signal) {
    signal.addEventListener('abort', dispose, { once: true });
  }

  return dispose;
}

// Bind native browser listeners to trigger immediate HEAD probe checks
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => check(true));
  window.addEventListener('offline', () => {
    isOnline = false;
    state.set('online', false);
    state.set('status', 'offline');
    bus.emit(names.connectivity.offline, { online: false });
    for (const listener of listeners) {
      try {
        listener(false);
      } catch (err) {
        console.error('Error in connectivity offline listener:', err);
      }
    }
  });
}
export { isOnline };

