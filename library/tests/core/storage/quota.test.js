/**
 * tests/core/storage/quota.test.js
 *
 * Quota Warning execution test suite.
 */

import { storage } from '@anzaui/anza/storage';

describe('Storage Quota Warnings', () => {
  let originalEstimate;

  beforeEach(() => {
    if (typeof navigator !== 'undefined' && navigator.storage) {
      originalEstimate = navigator.storage.estimate;
    }
  });

  afterEach(() => {
    if (typeof navigator !== 'undefined' && navigator.storage && originalEstimate) {
      navigator.storage.estimate = originalEstimate;
    }
  });

  it('should trigger registered quota warning listeners when usage exceeds 80%', async () => {
    // Stub estimate to return 90% usage
    if (typeof navigator !== 'undefined' && navigator.storage) {
      navigator.storage.estimate = async () => ({ usage: 90, quota: 100 });
    }

    let warningData = null;
    const dispose = storage.onQuotaWarning((data) => {
      warningData = data;
    });

    try {
      // Execute a write, which will trigger a proactive check
      await storage.set('quota-trigger-key', 'some-value', 'memory');

      if (!warningData) {
        throw new Error('Quota warning was not triggered');
      }
      if (warningData.usage !== 90 || warningData.quota !== 100) {
        throw new Error(`Expected { usage: 90, quota: 100 }, got ${JSON.stringify(warningData)}`);
      }
    } finally {
      dispose();
    }
  });

  it('should estimate correctly and report persisted status', async () => {
    if (typeof navigator !== 'undefined' && navigator.storage) {
      navigator.storage.estimate = async () => ({ usage: 45, quota: 100 });
    }

    const est = await storage.estimate();
    if (est.usage !== 45 || est.quota !== 100 || typeof est.persisted !== 'boolean') {
      throw new Error(`Unexpected estimate result: ${JSON.stringify(est)}`);
    }
  });
});
