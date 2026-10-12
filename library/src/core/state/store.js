/**
 * src/core/state/store.js
 *
 * Proxy-based reactive state store.
 * Tracks reactive read accesses (get) dynamically when an active subscriber
 * context is present, and schedules microtask-batched triggers on writes.
 * Supports manual batching (batch), serialization snapshots, and hydration.
 *
 * Source: doc 08 — State Management §4, §7, §8, §9
 */

import { derived } from './derived.js';
import { sync } from './sync.js';

let activeSubscriber = null;

/**
 * Sets the global active subscriber registry (used by reactive derived nodes).
 */
export function setActiveSubscriber(subscriber) {
  activeSubscriber = subscriber;
}

/**
 * Returns the current active subscriber registry.
 */
export function getActiveSubscriber() {
  return activeSubscriber;
}

function fastClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof RegExp) return new RegExp(obj);
  if (Array.isArray(obj)) {
    return obj.map(fastClone);
  }
  if (Object.getPrototypeOf(obj) === Object.prototype) {
    const copy = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        copy[key] = fastClone(obj[key]);
      }
    }
    return copy;
  }
  if (typeof structuredClone === 'function') {
    return structuredClone(obj);
  }
  return JSON.parse(JSON.stringify(obj));
}

export class ReactiveStore {
  #target;
  #state;
  #listeners = new Map(); // key -> Set<callback>
  #batching = false;
  #pendingNotifications = new Set();
  #scheduled = false; // one flush microtask at a time
  #onMutationCallback = null;
  #options;
  #proxies;
  #previousValues = new Map(); // Track previous values for subscribe callbacks

  constructor(initial = {}, options = {}) {
    const self = this;
    this.#target = initial;
    this.#options = options;
    this.#proxies = new WeakMap();

    this.#state = new Proxy(initial, {
      get(target, key) {
        self.#track(key);
        const val = Reflect.get(target, key);
        if (self.#options.deep && val !== null && typeof val === 'object' && !(val instanceof Date) && !(val instanceof RegExp)) {
          return self.#createProxy(val, key);
        }
        return val;
      },
      set(target, key, value) {
        const oldVal = Reflect.get(target, key);
        if (Object.is(oldVal, value)) return true;
        Reflect.set(target, key, value);
        self.#trigger(key);
        return true;
      },
      deleteProperty(target, key) {
        if (Reflect.has(target, key)) {
          Reflect.deleteProperty(target, key);
          self.#trigger(key);
        }
        return true;
      }
    });
  }

  #createProxy(target, topLevelKey) {
    if (target === null || typeof target !== 'object') return target;
    if (target instanceof Date || target instanceof RegExp) return target;
    
    if (this.#proxies.has(target)) {
      return this.#proxies.get(target);
    }

    const self = this;
    const proxy = new Proxy(target, {
      get(t, key) {
        if (key === '__raw__') return t;
        self.#track(topLevelKey);
        const val = Reflect.get(t, key);
        if (val !== null && typeof val === 'object' && !(val instanceof Date) && !(val instanceof RegExp)) {
          return self.#createProxy(val, topLevelKey);
        }
        return val;
      },
      set(t, key, val) {
        const oldVal = Reflect.get(t, key);
        if (Object.is(oldVal, val)) return true;
        Reflect.set(t, key, val);
        self.#trigger(topLevelKey);
        if (self.#onMutationCallback) {
          self.#onMutationCallback(topLevelKey, self.#state[topLevelKey], 'local');
        }
        return true;
      },
      deleteProperty(t, key) {
        if (Reflect.has(t, key)) {
          Reflect.deleteProperty(t, key);
          self.#trigger(topLevelKey);
          if (self.#onMutationCallback) {
            self.#onMutationCallback(topLevelKey, self.#state[topLevelKey], 'local');
          }
        }
        return true;
      }
    });

    this.#proxies.set(target, proxy);
    return proxy;
  }

  /**
   * Retrieves a property value from the reactive state.
   */
  get(key) {
    return this.#state[key];
  }

  /**
   * Modifies a property value in the reactive state.
   */
  set(key, value, source = 'local') {
    this.#previousValues.set(key, this.#state[key]);
    this.#state[key] = value;
    if (this.#onMutationCallback) {
      this.#onMutationCallback(key, value, source);
    }
  }

  /**
   * Registers a callback to monitor all state mutations (used by BroadcastChannel sync).
   */
  onMutation(callback) {
    this.#onMutationCallback = callback;
  }

  #track(key) {
    if (activeSubscriber) {
      activeSubscriber.add({ store: this, key });
    }
  }

  #trigger(key) {
    this.#pendingNotifications.add(key);
    if (!this.#batching) {
      this.#scheduleQueue();
    }
  }

  #scheduleQueue() {
    if (this.#scheduled) return;
    this.#scheduled = true;
    queueMicrotask(() => {
      this.#scheduled = false;
      if (this.#pendingNotifications.size === 0) return;
      const keys = [...this.#pendingNotifications];
      this.#pendingNotifications.clear();

      // Map each callback to one representative changed key so subscribers are
      // notified once per flush while still receiving the current value + key.
      const callbackKey = new Map();
      for (const key of keys) {
        const set = this.#listeners.get(key);
        if (set) {
          for (const cb of set) {
            if (!callbackKey.has(cb)) callbackKey.set(cb, key);
          }
        }
      }

      for (const [cb, key] of callbackKey) {
        try {
          const current = this.get(key);
          const previous = this.#previousValues.get(key);
          cb(current, key, previous);
          this.#previousValues.set(key, current);
        } catch (err) {
          console.error('Error executing store change subscription:', err);
        }
      }
    });
  }

  /**
   * Subscribes to changes on a specific state key.
   */
  subscribe(key, callback, signal) {
    if (signal?.aborted) return () => {};

    if (!this.#listeners.has(key)) {
      this.#listeners.set(key, new Set());
    }
    this.#listeners.get(key).add(callback);

    const dispose = () => {
      const set = this.#listeners.get(key);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.#listeners.delete(key);
        }
      }
    };

    if (signal) {
      signal.addEventListener('abort', dispose);
    }

    return dispose;
  }

  /**
   * Batches multiple mutations atomically in a single microtask notification.
   */
  batch(fn) {
    this.#batching = true;
    try {
       fn();
    } finally {
       this.#batching = false;
       this.#scheduleQueue();
    }
  }

  /**
   * Serializes a deep-cloned copy of the current store state.
   */
  snapshot() {
    if (this.#options?.clone) {
      return this.#options.clone(this.#target);
    }
    return fastClone(this.#target);
  }

  /**
   * Re-hydrates the store state from a snapshot without firing redundant triggers.
   */
  hydrate(snapshot) {
    this.batch(() => {
      for (const [key, value] of Object.entries(snapshot)) {
        this.#state[key] = value;
      }
    });
  }

  /**
   * Cleans and resets the store with new initial values.
   */
  reset(initial = {}) {
    this.batch(() => {
      for (const key of Object.keys(this.#state)) {
        delete this.#state[key];
      }
      for (const [key, value] of Object.entries(initial)) {
        this.#state[key] = value;
      }
    });
  }

  /**
   * Replicates designated store keys across active browser tabs.
   */
  broadcast(channelName, keys = []) {
    return sync(this, keys, channelName);
  }

  /**
   * Syncs designated store keys across active browser tabs (alias for broadcast).
   */
  sync(keys = [], channelName) {
    return this.broadcast(channelName, keys);
  }

  /**
   * Creates a reactive derived node linked to this store.
   */
  derived(keys, compute) {
    const fn = typeof keys === 'function' ? keys : compute;
    return derived(fn);
  }
}

