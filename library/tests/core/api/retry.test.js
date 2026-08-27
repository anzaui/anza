/**
 * tests/core/api/retry.test.js
 *
 * Core fetch retry execution test suite.
 *
 * Source: plan.md Phase 6-A, core/api/retry.js
 */

import { retry, PlatformError } from '@anzaui/anza/api';

describe('Fetch Retry Orchestration', () => {
  it('should immediately resolve successful operations', async () => {
    let calls = 0;
    const res = await retry(async () => {
      calls++;
      return 'OK';
    }, { attempts: 3, base: 1 });

    if (res !== 'OK') {
      throw new Error(`Expected "OK", got "${res}"`);
    }
    if (calls !== 1) {
      throw new Error(`Expected 1 call, got ${calls}`);
    }
  });

  it('should fail immediately on non-transient client errors', async () => {
    let calls = 0;
    const clientErr = new PlatformError({
      code: 'HTTP_ERROR',
      message: 'Bad Request',
      context: { status: 400 }
    });

    try {
      await retry(async () => {
        calls++;
        throw clientErr;
      }, { attempts: 3, base: 1 });
      throw new Error('Expected retry to throw immediately on 400 errors');
    } catch (err) {
      if (err !== clientErr) {
        throw new Error('Expected thrown error to match clientErr');
      }
      if (calls !== 1) {
        throw new Error(`Expected exactly 1 call before failure, got ${calls}`);
      }
    }
  });

  it('should retry transient errors up to the attempts threshold', async () => {
    let calls = 0;
    const transientErr = new PlatformError({
      code: 'NETWORK_ERROR',
      message: 'Connection dropped'
    });

    try {
      await retry(async () => {
        calls++;
        throw transientErr;
      }, { attempts: 3, base: 1, maxDelay: 5 });
      throw new Error('Expected retry to throw after maximum attempts');
    } catch (err) {
      if (err !== transientErr) {
        throw new Error('Expected thrown error to match transientErr');
      }
      if (calls !== 3) {
        throw new Error(`Expected 3 retry attempts, got ${calls}`);
      }
    }
  });

  it('should recover if a subsequent attempt succeeds', async () => {
    let calls = 0;
    const transientErr = new PlatformError({
      code: 'NETWORK_ERROR',
      message: 'Timeout'
    });

    const res = await retry(async () => {
      calls++;
      if (calls < 2) throw transientErr;
      return 'Recovered';
    }, { attempts: 3, base: 1, maxDelay: 5 });

    if (res !== 'Recovered') {
      throw new Error(`Expected "Recovered", got "${res}"`);
    }
    if (calls !== 2) {
      throw new Error(`Expected 2 calls, got ${calls}`);
    }
  });
});
