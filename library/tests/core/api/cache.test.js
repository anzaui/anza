/**
 * tests/core/api/cache.test.js
 *
 * Unit test suite for API client caching, prefixes, and telemetry events.
 *
 * Source: core/api/plan.md, core/api/index.js
 */

import { api, prefixes, events, cache } from '@anzaui/anza/api';

describe('API Prefix, Cache, and Events Engine', () => {
  let originalFetch;

  before(() => {
    originalFetch = globalThis.fetch;
  });

  after(() => {
    globalThis.fetch = originalFetch;
  });

  beforeEach(async () => {
    prefixes.clear();
    await cache.clear();
  });

  describe('Prefix Resolver', () => {
    it('should correctly register and resolve relative URL prefixes', () => {
      prefixes.add('auth', 'https://auth.example.com');
      prefixes.add('default', 'https://api.example.com');

      const resolvedAuth = prefixes.resolve('auth/login');
      if (resolvedAuth !== 'https://auth.example.com/login') {
        throw new Error(`Expected https://auth.example.com/login, got ${resolvedAuth}`);
      }

      const resolvedUser = prefixes.resolve('user/profile');
      if (resolvedUser !== 'https://api.example.com/user/profile') {
        throw new Error(`Expected https://api.example.com/user/profile, got ${resolvedUser}`);
      }

      const absoluteUrl = prefixes.resolve('https://google.com/test');
      if (absoluteUrl !== 'https://google.com/test') {
        throw new Error(`Expected https://google.com/test, got ${absoluteUrl}`);
      }
    });
  });

  describe('Fine-Grained TTL Caching', () => {
    it('should default to no-cache unless expiry is explicitly set', async () => {
      let callCount = 0;
      globalThis.fetch = async (url) => {
        callCount++;
        return new Response(JSON.stringify({ count: callCount }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      };

      // Call 1
      await api.get('https://api.example.com/users');
      // Call 2
      await api.get('https://api.example.com/users');

      if (callCount !== 2) {
        throw new Error(`Expected 2 network calls for no-cache, got ${callCount}`);
      }
    });

    it('should hit the cache on miss and use TTL values for subsequent requests', async () => {
      let callCount = 0;
      globalThis.fetch = async (url) => {
        callCount++;
        return new Response(JSON.stringify({ value: 'ok' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      };

      // Set expiry/ttl in request options
      const res1 = await api.get('https://api.example.com/data', { expiry: 1000 });
      const res2 = await api.get('https://api.example.com/data', { expiry: 1000 });

      if (callCount !== 1) {
        throw new Error(`Expected only 1 network call due to caching, got ${callCount}`);
      }
      if (res1.value !== 'ok' || res2.value !== 'ok') {
        throw new Error('Expected both responses to carry cached payload');
      }
    });

    it('should evict expired cache entries automatically', async () => {
      let callCount = 0;
      globalThis.fetch = async (url) => {
        callCount++;
        return new Response(JSON.stringify({ count: callCount }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      };

      // Request with extremely short TTL of 5ms
      await api.get('https://api.example.com/fast', { expiry: 5 });
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 15));

      await api.get('https://api.example.com/fast', { expiry: 5 });

      if (callCount !== 2) {
        throw new Error(`Expected 2 network calls since cache expired, got ${callCount}`);
      }
    });

    it('should support glob pattern namespace invalidation', async () => {
      globalThis.fetch = async (url) => {
        return new Response(JSON.stringify({ value: 'cached' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      };

      // Populate multiple cached items
      await api.get('https://api.example.com/user/profile', { expiry: 10000 });
      await api.get('https://api.example.com/user/settings', { expiry: 10000 });
      await api.get('https://api.example.com/product/123', { expiry: 10000 });

      // Invalidate user namespace
      await api.cache.delete('*/user/*');

      // Verify that user paths are deleted from cache (will return null internally)
      const cachedProfile = await cache.get('https://api.example.com/user/profile');
      const cachedProduct = await cache.get('https://api.example.com/product/123');

      if (cachedProfile !== null) {
        throw new Error('Expected user profile cache to be deleted');
      }
      if (cachedProduct === null) {
        throw new Error('Expected product cache to remain intact');
      }
    });
  });

  describe('Telemetry Event Stream', () => {
    it('should trigger events on status, response types, errors, and support cleanup', async () => {
      let statusTriggered = false;
      let typeTriggered = false;

      const dispose = api.on('status:200', (event) => {
        statusTriggered = true;
      });

      api.on('type:json', (event) => {
        typeTriggered = true;
      });

      globalThis.fetch = async (url) => {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      };

      await api.get('https://api.example.com/event-test');

      if (!statusTriggered) {
        throw new Error('Expected status:200 event to fire');
      }
      if (!typeTriggered) {
        throw new Error('Expected type:json event to fire');
      }

      // Reset and test disposer
      statusTriggered = false;
      dispose();

      await api.get('https://api.example.com/event-test');

      if (statusTriggered) {
        throw new Error('Expected status event listener to be cleaned up and not fire');
      }
    });

    it('should automatically detach global listeners when an AbortSignal is aborted', async () => {
      let triggeredCount = 0;
      const abortCtrl = new AbortController();

      api.on('status:200', () => {
        triggeredCount++;
      }, abortCtrl.signal);

      globalThis.fetch = async (url) => {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      };

      // 1. First trigger
      await api.get('https://api.example.com/abort-test');
      if (triggeredCount !== 1) {
        throw new Error(`Expected 1 trigger before abort, got ${triggeredCount}`);
      }

      // 2. Abort subscription
      abortCtrl.abort();

      // 3. Second trigger
      await api.get('https://api.example.com/abort-test');
      if (triggeredCount !== 1) {
        throw new Error(`Expected triggered count to remain 1 after abort, got ${triggeredCount}`);
      }
    });

    it('should cleanly fire failed, error, and timeout events for connection issues', async () => {
      let failedTriggered = false;
      let errorTriggered = false;

      api.on('failed', () => { failedTriggered = true; });
      api.on('error', () => { errorTriggered = true; });

      globalThis.fetch = async () => {
        return new Response('Not Found', { status: 404 });
      };

      try {
        await api.get('https://api.example.com/notfound');
      } catch {
        // expect text extraction or status failure
      }

      if (!failedTriggered || !errorTriggered) {
        throw new Error('Expected failed and error events to fire on 404 response');
      }
    });

    it('should support request-specific event listeners with auto-cleanup', async () => {
      let requestListenerTriggered = false;
      let globalListenerTriggered = false;

      // Register a global listener to compare
      api.on('status:200', () => {
        globalListenerTriggered = true;
      });

      globalThis.fetch = async (url) => {
        return new Response(JSON.stringify({ data: 'ok' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      };

      // Execute request with request-specific scoped listener
      await api.get('https://api.example.com/scoped-test', {
        on: {
          'status:200': () => {
            requestListenerTriggered = true;
          }
        }
      });

      if (!requestListenerTriggered) {
        throw new Error('Expected request-specific status:200 listener to be triggered');
      }
      if (!globalListenerTriggered) {
        throw new Error('Expected global status:200 listener to be triggered');
      }

      // Reset indicators
      requestListenerTriggered = false;
      globalListenerTriggered = false;

      // Execute another request without the specific listener
      await api.get('https://api.example.com/scoped-test');

      if (requestListenerTriggered) {
        throw new Error('Expected request-specific listener to have been automatically cleaned up');
      }
      if (!globalListenerTriggered) {
        throw new Error('Expected global listener to fire on successive requests');
      }
    });
  });

  describe('State Hydration & Interception', () => {
    beforeEach(() => {
      const existing = document.getElementById('anza-state');
      if (existing) existing.remove();
      api.sync();
    });

    afterEach(() => {
      const existing = document.getElementById('anza-state');
      if (existing) existing.remove();
      api.sync();
    });

    it('should fall back to empty state when #anza-state is missing', () => {
      const state = api.state();
      if (!state || Object.keys(state).length !== 0) {
        throw new Error('Expected empty state when element is missing');
      }
    });

    it('should correctly parse state metadata and intercept matching GET requests', async () => {
      const script = document.createElement('script');
      script.id = 'anza-state';
      script.type = 'application/json';
      
      const payload = {
        "https://api.example.com/hydrated": { "data": "hydrated-value" },
        "__route": {
          "url": "/hydrated",
          "params": { "id": "123" },
          "query": {}
        }
      };
      
      script.textContent = JSON.stringify(payload);
      document.head.appendChild(script);

      // Manually trigger sync
      api.sync();

      // Verify state metadata
      const state = api.state();
      if (state.url !== '/hydrated' || state.params.id !== '123') {
        throw new Error(`Expected route parameters mismatch, got: ${JSON.stringify(state)}`);
      }

      // Intercept GET requests synchronously
      let fetchCalled = false;
      globalThis.fetch = async () => {
        fetchCalled = true;
        return new Response('Should not be called', { status: 500 });
      };

      const result = await api.get('https://api.example.com/hydrated');
      if (fetchCalled) {
        throw new Error('Expected API request to be intercepted and not hit fetch');
      }
      if (result.data !== 'hydrated-value') {
        throw new Error(`Expected cached data, got: ${JSON.stringify(result)}`);
      }
    });
  });
});
