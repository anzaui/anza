/**
 * tests/core/offline/connectivity.test.js
 *
 * Core connectivity monitor execution test suite.
 *
 * Source: plan.md Phase 6-A, core/offline/connectivity.js
 */

import { check, subscribe } from '@anzaui/anza/offline';

describe('Connectivity Monitor', () => {
  let originalFetch;
  let fetchCount = 0;

  before(() => {
    originalFetch = globalThis.fetch;
  });

  after(() => {
    globalThis.fetch = originalFetch;
  });

  beforeEach(() => {
    fetchCount = 0;
  });

  it('should immediately feed current status on subscription', () => {
    let status = null;
    const dispose = subscribe((state) => {
      status = state;
    });

    if (typeof status !== 'boolean') {
      throw new Error(`Expected boolean connectivity status, got: ${status}`);
    }

    dispose();
  });

  it('should trigger HEAD probes and broadcast state updates', async () => {
    globalThis.fetch = async (url, opts) => {
      fetchCount++;
      if (opts.method !== 'HEAD') {
        throw new Error(`Expected HEAD method, got: ${opts.method}`);
      }
      return { ok: true };
    };

    let receivedState = null;
    const dispose = subscribe((state) => {
      receivedState = state;
    });

    const isOnline = await check(true);
    if (!isOnline) {
      throw new Error('Expected check to resolve to true');
    }
    if (receivedState !== true) {
      throw new Error('Expected subscriber to receive true');
    }
    if (fetchCount !== 1) {
      throw new Error(`Expected 1 fetch call, got ${fetchCount}`);
    }

    dispose();
  });

  it('should respect the 10-second rate-limiting cache window unless forced', async () => {
    globalThis.fetch = async () => {
      fetchCount++;
      return { ok: true };
    };

    // First force check triggers a probe
    await check(true);
    // Consecutive non-force check should return cached value instantly without dispatching probe
    await check(false);

    if (fetchCount !== 1) {
      throw new Error(`Expected cached state to avoid redundant probe. fetchCount is ${fetchCount}`);
    }
  });

  it('should clean up abort event listeners on signal to prevent memory leaks', () => {
    const controller = new AbortController();
    const signal = controller.signal;

    let added = 0;
    let removed = 0;

    const originalAdd = signal.addEventListener;
    const originalRemove = signal.removeEventListener;

    signal.addEventListener = function(type) {
      if (type === 'abort') added++;
      return originalAdd.apply(this, arguments);
    };

    signal.removeEventListener = function(type) {
      if (type === 'abort') removed++;
      return originalRemove.apply(this, arguments);
    };

    const dispose = subscribe(() => {}, signal);

    if (added !== 1) {
      throw new Error(`Expected 1 abort listener added, got ${added}`);
    }

    dispose();

    if (removed !== 1) {
      throw new Error(`Expected 1 abort listener removed, got ${removed}`);
    }

    // Restore
    signal.addEventListener = originalAdd;
    signal.removeEventListener = originalRemove;
  });

  it('should clean up abort event listeners when signal aborts', () => {
    const controller = new AbortController();
    const signal = controller.signal;

    let added = 0;
    let removed = 0;

    const originalAdd = signal.addEventListener;
    const originalRemove = signal.removeEventListener;

    signal.addEventListener = function(type) {
      if (type === 'abort') added++;
      return originalAdd.apply(this, arguments);
    };

    signal.removeEventListener = function(type) {
      if (type === 'abort') removed++;
      return originalRemove.apply(this, arguments);
    };

    subscribe(() => {}, signal);

    if (added !== 1) {
      throw new Error(`Expected 1 abort listener added, got ${added}`);
    }

    controller.abort();

    if (removed !== 1) {
      throw new Error(`Expected 1 abort listener removed, got ${removed}`);
    }

    // Restore
    signal.addEventListener = originalAdd;
    signal.removeEventListener = originalRemove;
  });
});
