/**
 * tests/core/offline/lock.test.js
 *
 * Fallback replay lock coordination execution test suite.
 */

import { sync } from '@anzaui/anza/offline';

describe('Fallback Replay Lock Coordination', () => {
  it('should coordinate manual fallback sync triggers under a Web Lock', async () => {
    if (typeof navigator === 'undefined' || !navigator.locks) {
      // Skip if Web Locks API is not available
      return;
    }

    let executionCount = 0;
    let maxConcurrent = 0;
    let started = 0;
    let resolveFirst = null;
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });

    // Resolves once `n` handler runs have started (no fixed sleeps: CI timing varies).
    const waiters = [];
    const whenStarted = (n) =>
      started >= n ? Promise.resolve() : new Promise((resolve) => waiters.push({ n, resolve }));
    const within = (promise, ms, what) =>
      Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out waiting for ${what}`)), ms))
      ]);

    const dispose = sync.onSyncFallback(async () => {
      started++;
      executionCount++;
      maxConcurrent = Math.max(maxConcurrent, executionCount);
      for (const w of waiters.splice(0)) (started >= w.n ? w.resolve : () => waiters.push(w))();
      // Hold the lock
      await firstPromise;
      executionCount--;
    });

    try {
      // Trigger the fallback events in rapid succession
      window.dispatchEvent(new CustomEvent('core:sync-fallback', { detail: { tag: 'tag-1' } }));
      window.dispatchEvent(new CustomEvent('core:sync-fallback', { detail: { tag: 'tag-2' } }));

      // The first run holds the lock; give a second run every chance to start concurrently.
      await within(whenStarted(1), 2000, 'the first fallback run');
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Only one execution should run at a time
      if (maxConcurrent !== 1 || started !== 1) {
        throw new Error(`Expected exactly 1 active fallback execution under Web Lock, got: ${maxConcurrent} (started ${started})`);
      }

      // Release the first lock; the second run may now take it.
      resolveFirst();
      await within(whenStarted(2), 2000, 'the second fallback run');
      await new Promise((resolve) => setTimeout(resolve, 0));

      if (maxConcurrent !== 1) {
        throw new Error(`Expected lock coordination to keep concurrency at 1, max concurrent was: ${maxConcurrent}`);
      }
    } finally {
      dispose();
    }
  });
});
