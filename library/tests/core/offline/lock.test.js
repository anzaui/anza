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
    let resolveFirst = null;
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });

    const dispose = sync.onSyncFallback(async () => {
      executionCount++;
      maxConcurrent = Math.max(maxConcurrent, executionCount);
      // Hold the lock
      await firstPromise;
      executionCount--;
    });

    try {
      // Trigger the fallback events in rapid succession
      window.dispatchEvent(new CustomEvent('core:sync-fallback', { detail: { tag: 'tag-1' } }));
      window.dispatchEvent(new CustomEvent('core:sync-fallback', { detail: { tag: 'tag-2' } }));

      // Wait for the asynchronous events to fire
      await new Promise((resolve) => setTimeout(resolve, 30));

      // Only one execution should run at a time
      if (maxConcurrent !== 1) {
        throw new Error(`Expected at most 1 active fallback execution under Web Lock, got: ${maxConcurrent}`);
      }

      // Release the first lock
      resolveFirst();

      // Wait for the second execution to finish
      await new Promise((resolve) => setTimeout(resolve, 30));

      if (maxConcurrent !== 1) {
        throw new Error(`Expected lock coordination to keep concurrency at 1, max concurrent was: ${maxConcurrent}`);
      }
    } finally {
      dispose();
    }
  });
});
