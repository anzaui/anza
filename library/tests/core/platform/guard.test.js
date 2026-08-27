/**
 * tests/core/platform/guard.test.js
 *
 * Guard feature-gate and dynamic polyfill loading test suite.
 *
 * Source: plan.md Phase 6-A, core/platform/guard.js
 */

import { supports, guard, reset } from '@anzaui/anza/platform';

describe('Platform Guard', () => {
  it('should resolve urlPattern wrapper and expose match capability', async () => {
    const URLPatternClass = await guard.urlPattern();
    if (!URLPatternClass) {
      throw new Error('Expected urlPattern wrapper to resolve to a class/function');
    }

    const pattern = new URLPatternClass({ pathname: '/users/:id' });
    const match = pattern.exec('http://example.com/users/42');
    if (!match || match.pathname.groups.id !== '42') {
      throw new Error('Expected urlPattern matching to work correctly');
    }
  });

  it('should resolve navigation API wrapper', async () => {
    const nav = await guard.navigation();
    if (!nav) {
      throw new Error('Expected navigation wrapper to resolve to an object');
    }
    if (typeof nav.navigate !== 'function') {
      throw new Error('Expected navigation object to expose navigate function');
    }
  });

  it('should resolve popover initializer without errors', async () => {
    // Calling popover() should either use native or install the polyfill.
    // Ensure it resolves cleanly.
    await guard.popover();
  });

  it('should resolve shadow initializer without errors', async () => {
    await guard.shadow(document);
  });

  it('should resolve anchor positioning wrapper', async () => {
    const floatEl = document.createElement('div');
    const anchorEl = document.createElement('div');
    document.body.appendChild(floatEl);
    document.body.appendChild(anchorEl);

    try {
      await guard.anchor(floatEl, anchorEl, { placement: 'bottom-start' });
      // If polyfilled, styles will be set, if native, nothing/native takes care.
      // Verification that it runs without crash is sufficient.
    } finally {
      floatEl.remove();
      anchorEl.remove();
    }
  });

  it('should resolve sanitizer wrapper and return a functional sanitizer', async () => {
    const s = await guard.sanitizer();
    if (!s || typeof s.sanitizeToString !== 'function') {
      throw new Error('Expected sanitizer wrapper to resolve to an object with sanitizeToString');
    }

    const clean = s.sanitizeToString('<div>test</div>');
    if (typeof clean !== 'string') {
      throw new Error('Expected sanitized output to be a string');
    }
  });

  it('should resolve scheduler wrapper and yield task correctly', async () => {
    const scheduler = await guard.scheduler();
    if (!scheduler || typeof scheduler.postTask !== 'function') {
      throw new Error('Expected scheduler wrapper to resolve to an object with postTask');
    }

    let completed = false;
    await scheduler.postTask(() => {
      completed = true;
    });

    if (!completed) {
      throw new Error('Expected scheduled postTask to execute');
    }

    // Verify yield works correctly
    await guard.yield();
  });

  it('should load polyfills dynamically when features are unsupported', async () => {
    const descUrl = Object.getOwnPropertyDescriptor(supports, 'urlPattern');
    const descNav = Object.getOwnPropertyDescriptor(supports, 'navigationAPI');
    const descSched = Object.getOwnPropertyDescriptor(supports, 'schedulerPostTask');

    Object.defineProperty(supports, 'urlPattern', { value: false, configurable: true });
    Object.defineProperty(supports, 'navigationAPI', { value: false, configurable: true });
    Object.defineProperty(supports, 'schedulerPostTask', { value: false, configurable: true });

    try {
      const URLPatternPolyfill = await guard.urlPattern();
      if (!URLPatternPolyfill) {
        throw new Error('Expected URLPattern polyfill to load');
      }
      const pattern = new URLPatternPolyfill({ pathname: '/posts/:id' });
      const match = pattern.exec('http://example.com/posts/abc');
      if (!match || match.pathname.groups.id !== 'abc') {
        throw new Error('Expected polyfill URLPattern to work correctly');
      }

      const nav = await guard.navigation();
      if (!nav || typeof nav.navigate !== 'function') {
        throw new Error('Expected navigation polyfill to load and expose navigate');
      }

      const sched = await guard.scheduler();
      if (!sched || typeof sched.postTask !== 'function') {
        throw new Error('Expected scheduler polyfill to load and expose postTask');
      }
    } finally {
      Object.defineProperty(supports, 'urlPattern', descUrl);
      Object.defineProperty(supports, 'navigationAPI', descNav);
      Object.defineProperty(supports, 'schedulerPostTask', descSched);
      
      reset('urlPattern');
      reset('navigationAPI');
      reset('schedulerPostTask');
    }
  });
});
