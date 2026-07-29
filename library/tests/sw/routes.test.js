/**
 * tests/sw/routes.test.js
 *
 * SW pattern router must evaluate cleanly without URLPattern (Firefox SW
 * global) and must not throw on catch-all `*` / subpath patterns.
 */

import { router } from '../../src/sw/routes.js';

describe('SW routes normalize', () => {
  let OriginalURLPattern;

  beforeEach(() => {
    OriginalURLPattern = globalThis.URLPattern;
  });

  afterEach(() => {
    if (OriginalURLPattern) {
      globalThis.URLPattern = OriginalURLPattern;
    } else {
      delete globalThis.URLPattern;
    }
  });

  it('registers catch-all and subpath patterns when URLPattern is undefined', () => {
    delete globalThis.URLPattern;

    const r = router();
    // Must not throw during script-eval equivalent (top-level register)
    r.register('*', { handle: async () => new Response('shell') });
    r.register('/anza/api/*', { handle: async () => new Response('api') });

    const shellEvent = {
      request: { url: 'https://aduki-org.github.io/anza/app.js' },
      respondWith(p) {
        this._p = p;
      }
    };
    if (!r.handle(shellEvent)) {
      throw new Error('Expected catch-all to match shell asset');
    }

    const apiEvent = {
      request: { url: 'https://aduki-org.github.io/anza/api/status' },
      respondWith(p) {
        this._p = p;
      }
    };
    // First matching route wins; catch-all is registered first — still must not throw.
    if (!r.handle(apiEvent)) {
      throw new Error('Expected a registered pattern to match api URL');
    }
  });

  it('does not throw on instanceof when URLPattern is missing', () => {
    delete globalThis.URLPattern;
    const r = router();
    r.register('*', { handle: async () => new Response('ok') });
  });

  it('matches pathname patterns via fallback regex under /anza/ scope', () => {
    delete globalThis.URLPattern;

    const r = router();
    let hit = null;
    r.register('/anza/api/*', {
      handle: async (req) => {
        hit = req.url;
        return new Response('api');
      }
    });

    const miss = {
      request: { url: 'https://aduki-org.github.io/anza/app.js' },
      respondWith() {}
    };
    if (r.handle(miss)) {
      throw new Error('Expected non-api path to miss /anza/api/*');
    }

    const hitEvent = {
      request: { url: 'https://aduki-org.github.io/anza/api/x' },
      respondWith(p) {
        this._p = p;
      }
    };
    if (!r.handle(hitEvent)) {
      throw new Error('Expected /anza/api/x to match /anza/api/*');
    }
  });

  it('registers catch-all safely when URLPattern is present', () => {
    if (typeof URLPattern === 'undefined') {
      // Environment without URLPattern — covered by tests above.
      return;
    }
    const r = router();
    r.register('*', { handle: async () => new Response('shell') });
    r.register('/api/*', { handle: async () => new Response('api') });

    const event = {
      request: { url: 'https://example.com/foo' },
      respondWith(p) {
        this._p = p;
      }
    };
    if (!r.handle(event)) {
      throw new Error('Expected catch-all to match when URLPattern exists');
    }
  });
});
