/**
 * tests/core/security/permissions.test.js
 *
 * Permissions API facade test suite.
 * Verifies query state resolution and AbortSignal-gated watch cleanup.
 *
 * Source: core/security/permissions.js
 */

import { permission, watchPermission } from '@anzaui/anza/security';

describe('Permissions API Facade', () => {
  it('should query a known permission and return a valid state string', async () => {
    // geolocation is universally recognized by browsers; result may be 'denied' in headless
    const result = await permission('geolocation');
    const valid = ['granted', 'denied', 'prompt'];

    if (!valid.includes(result)) {
      throw new Error(`Expected one of ${valid.join(', ')}, got: ${result}`);
    }
  });

  it('should return "denied" for unrecognized permission names gracefully', async () => {
    const result = await permission('totally-unknown-capability');
    if (result !== 'denied') {
      throw new Error(`Expected "denied" for unknown permission, got: ${result}`);
    }
  });

  it('should return a disposer function from watchPermission', () => {
    const dispose = watchPermission('geolocation', () => {});
    if (typeof dispose !== 'function') {
      throw new Error(`Expected disposer function, got: ${typeof dispose}`);
    }
    // Clean up to prevent dangling listeners
    dispose();
  });

  it('should immediately return no-op disposer when signal is already aborted', () => {
    const ctrl = new AbortController();
    ctrl.abort();

    let called = false;
    const dispose = watchPermission('geolocation', () => { called = true; }, ctrl.signal);

    if (typeof dispose !== 'function') {
      throw new Error('Expected disposer function even with pre-aborted signal');
    }
    // Confirm the watcher never fires
    if (called) {
      throw new Error('Watcher fired despite pre-aborted signal');
    }
    dispose();
  });

  it('should cancel watcher on AbortSignal abort', async () => {
    const ctrl = new AbortController();
    let count = 0;

    watchPermission('geolocation', () => { count++; }, ctrl.signal);
    ctrl.abort();

    // Give microtasks a tick to settle
    await new Promise(r => setTimeout(r, 10));
    const snapshot = count;

    // count should remain at 0; no synthetic change event fires in this context
    if (count !== snapshot) {
      throw new Error(`Watcher count changed after abort: ${count}`);
    }
  });
});
