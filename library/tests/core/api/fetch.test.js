/**
 * tests/core/api/fetch.test.js
 *
 * Core fetch execution test suite.
 *
 * Source: plan.md Phase 6-A, core/api/fetch.js
 */

import { execute, PlatformError } from '@anzaui/anza/api';

describe('Fetch Executor', () => {
  let originalFetch;

  before(() => {
    originalFetch = globalThis.fetch;
  });

  after(() => {
    globalThis.fetch = originalFetch;
  });

  it('should successfully execute valid HTTP requests', async () => {
    globalThis.fetch = async (url, opts) => {
      return {
        ok: true,
        status: 200,
        text: async () => 'Success payload'
      };
    };

    const res = await execute({ url: '/api/test', method: 'GET' });
    if (res.status !== 200) {
      throw new Error(`Expected status 200, got ${res.status}`);
    }
    const txt = await res.text();
    if (txt !== 'Success payload') {
      throw new Error(`Expected text "Success payload", got "${txt}"`);
    }
  });

  it('should map HTTP errors to PlatformError status shapes', async () => {
    globalThis.fetch = async () => {
      return {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      };
    };

    try {
      await execute({ url: '/api/error', method: 'POST' });
      throw new Error('Expected execute to throw an HTTP_ERROR PlatformError');
    } catch (err) {
      if (!(err instanceof PlatformError)) {
        throw new Error(`Expected PlatformError, got ${err.name}`);
      }
      if (err.code !== 'HTTP_ERROR') {
        throw new Error(`Expected code "HTTP_ERROR", got "${err.code}"`);
      }
      if (!err.recoverable) {
        throw new Error('Expected 500 server errors to be flagged recoverable');
      }
    }
  });

  it('should handle request aborts and timeouts cleanly', async () => {
    globalThis.fetch = async (url, opts) => {
      return new Promise((_, reject) => {
        if (opts.signal) {
          opts.signal.addEventListener('abort', () => {
            reject(new DOMException('The user aborted a request.', 'AbortError'));
          });
        }
      });
    };

    const abortCtrl = new AbortController();
    const promise = execute({ url: '/api/timeout', timeout: 50, signal: abortCtrl.signal });

    // Instantly abort request
    abortCtrl.abort('userCancel');

    try {
      await promise;
      throw new Error('Expected execute to abort');
    } catch (err) {
      if (!(err instanceof PlatformError)) {
        throw new Error(`Expected PlatformError, got ${err.name}`);
      }
    }
  });
});
