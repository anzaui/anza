/**
 * src/core/events/delegate.js
 *
 * High-performance event delegation with composedPath matching.
 * Handles dynamic delegation of events traversing Shadow DOM boundaries.
 *
 * Source: doc 10 — Event Architecture §6
 */

import {
  isExcludedByNot,
  matchInComposedPath,
  matchesAttrs
} from './match.js';

/**
 * Attaches a delegated event listener to an ancestor root element.
 *
 * @param {EventTarget} root - The root container element.
 * @param {string} selector - The query selector to match dynamic descendants.
 * @param {string} type - The event name to intercept.
 * @param {Function} handler - The listener callback, with `this` bound to the matched element.
 * @param {Object} [options={}] - addEventListener options plus `attrs`, `not`, `key`, `scope`.
 * @returns {Function} A disposer function that unregisters the delegation hook.
 */
export function delegate(root, selector, type, handler, options = {}) {
  const signal = options.signal;
  if (signal?.aborted) return () => {};

  if (typeof selector !== 'string' || typeof handler !== 'function') {
    return () => {};
  }

  const scope = options.scope === 'assigned' ? 'assigned' : 'path';
  const attrs = options.attrs;
  const not = options.not;
  const listenerOpts = { ...options };
  delete listenerOpts.attrs;
  delete listenerOpts.not;
  delete listenerOpts.key;
  delete listenerOpts.scope;

  const listener = (event) => {
    const match = matchInComposedPath(event, selector, root, scope);
    if (!match) return;
    if (!matchesAttrs(match, attrs)) return;
    if (isExcludedByNot(match, not, root)) return;
    handler.call(match, event, match);
  };

  root.addEventListener(type, listener, listenerOpts);

  let mapKey = null;
  let store = null;

  const dispose = () => {
    root.removeEventListener(type, listener, listenerOpts);
    if (signal) {
      signal.removeEventListener('abort', dispose);
    }
    if (store && mapKey != null && store.get(mapKey) === dispose) {
      store.delete(mapKey);
    }
  };

  // Optional dedupe: same key on same root+type replaces prior registration.
  if (options.key != null) {
    store = getKeyStore(root);
    mapKey = `${String(type)}:${options.capture ? 'c' : 'b'}:${String(options.key)}`;
    const prev = store.get(mapKey);
    if (prev) prev();
    store.set(mapKey, dispose);
  }

  if (signal) {
    signal.addEventListener('abort', dispose, { once: true });
  }

  return dispose;
}

const keyStores = new WeakMap();

function getKeyStore(root) {
  let store = keyStores.get(root);
  if (!store) {
    store = new Map();
    keyStores.set(root, store);
  }
  return store;
}
