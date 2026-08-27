/**
 * tests/core/offline/state.test.js
 *
 * Offline state integration execution test suite.
 */

import { state, check, queue } from '@anzaui/anza/offline';

describe('Offline State Integration', () => {
  beforeEach(async () => {
    await queue.clear();
  });

  afterEach(async () => {
    await queue.clear();
  });

  it('should initialize state with default properties', () => {
    const snapshot = state.snapshot();
    if (typeof snapshot.online !== 'boolean') {
      throw new Error(`Expected boolean online, got ${snapshot.online}`);
    }
    if (typeof snapshot.status !== 'string') {
      throw new Error(`Expected string status, got ${snapshot.status}`);
    }
    if (typeof snapshot.pending !== 'number') {
      throw new Error(`Expected number pending, got ${snapshot.pending}`);
    }
  });

  it('should sync connectivity changes with the state store', async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => {
        return { ok: true };
      };
      
      await check(true);
      if (state.get('online') !== true || state.get('status') !== 'online') {
        throw new Error(`Expected online state, got: ${JSON.stringify(state.snapshot())}`);
      }

      globalThis.fetch = async () => {
        throw new Error('Network error');
      };
      
      await check(true);
      if (state.get('online') !== false || state.get('status') !== 'offline') {
        throw new Error(`Expected offline state, got: ${JSON.stringify(state.snapshot())}`);
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should sync pending queue count with the state store', async () => {
    if (state.get('pending') !== 0) {
      throw new Error(`Expected initial pending to be 0, got ${state.get('pending')}`);
    }

    const id = await queue.push('test-task', { data: 1 });
    if (state.get('pending') !== 1) {
      throw new Error(`Expected pending to be 1, got ${state.get('pending')}`);
    }

    await queue.delete(id);
    if (state.get('pending') !== 0) {
      throw new Error(`Expected pending to be 0 after delete, got ${state.get('pending')}`);
    }
  });
});
