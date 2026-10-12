/**
 * tests/core/platform/hotpaths.test.js
 *
 * P9: storage quota check is throttled and skipped for the memory tier.
 * P10: a store schedules one flush microtask per batch of writes.
 * P11: router sorts lazily, before the first match, with the same order.
 */

import { storage } from '@anzaui/anza/storage';
import { ReactiveStore } from '@anzaui/anza/state';
import { register, match, clear, getRoutes } from '@anzaui/anza/router';

describe('storage quota check (P9)', () => {
  let originalEstimate;
  let calls;

  beforeEach(() => {
    originalEstimate = navigator.storage.estimate;
    calls = 0;
    navigator.storage.estimate = async () => {
      calls++;
      return { usage: 1, quota: 100 };
    };
  });

  afterEach(() => {
    navigator.storage.estimate = originalEstimate;
  });

  it('never runs for the memory tier', async () => {
    await storage.set('hot-mem-1', 'a', 'memory');
    await storage.set('hot-mem-2', 'b', 'memory');
    if (calls !== 0) throw new Error(`expected no estimate() for memory writes, got ${calls}`);
  });

  it('runs at most once per interval for persistent writes', async () => {
    await storage.set('hot-idb-1', { a: 1 }, 'idb');
    await storage.set('hot-idb-2', { b: 2 }, 'idb');
    await storage.set('hot-idb-3', 'x', 'idb');
    if (calls > 1) throw new Error(`expected a throttled quota check, got ${calls} calls`);
    const value = await storage.get('hot-idb-1');
    if (value?.a !== 1) throw new Error('expected the object to round-trip');
    for (const k of ['hot-idb-1', 'hot-idb-2', 'hot-idb-3']) await storage.delete(k);
  });
});

describe('store flush scheduling (P10)', () => {
  it('queues one microtask for many writes and notifies once', async () => {
    const store = new ReactiveStore({ a: 0, b: 0 });
    let notified = 0;
    store.subscribe('a', () => notified++);
    store.subscribe('b', () => notified++);

    const original = globalThis.queueMicrotask;
    let queued = 0;
    globalThis.queueMicrotask = (fn) => {
      queued++;
      return original(fn);
    };
    try {
      for (let i = 1; i <= 50; i++) {
        store.set('a', i);
        store.set('b', i);
      }
    } finally {
      globalThis.queueMicrotask = original;
    }
    await Promise.resolve();
    await Promise.resolve();
    if (queued !== 1) throw new Error(`expected one scheduled flush, got ${queued}`);
    if (notified !== 2) throw new Error(`expected each subscriber notified once, got ${notified}`);

    // A later write schedules a new flush.
    store.set('a', 100);
    await Promise.resolve();
    if (notified !== 3) throw new Error('expected a second flush after the first completed');
  });
});

describe('router lazy sort (P11)', () => {
  afterEach(() => clear());

  it('matches the most specific route regardless of registration order', async () => {
    clear();
    register('/docs/*', 'page-docs-any');
    register('/docs/:slug', 'page-docs-slug');
    register('/docs/intro', 'page-docs-intro');
    const routes = getRoutes().map((r) => r.patternStr);
    if (routes[0] !== '/docs/intro') throw new Error(`expected sorted routes, got ${routes}`);
    const hit = await match('/docs/intro');
    if (hit?.tag !== 'page-docs-intro') throw new Error(`expected literal route, got ${hit?.tag}`);
    const param = await match('/docs/other');
    if (param?.tag !== 'page-docs-slug') throw new Error(`expected param route, got ${param?.tag}`);
  });
});
