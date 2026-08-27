/**
 * tests/core/events/once.test.js
 *
 * once() single-event helper test suite.
 * Verifies: resolution, listener cleanup, signal-abort rejection, and pre-aborted signal rejection.
 *
 * Source: core/events/once.js
 */

import { once } from '@anzaui/anza/events';

describe('once() Single-Event Helper', () => {
  it('should resolve with the event when it fires', async () => {
    const el = document.createElement('div');
    const promise = once(el, 'custom:test');

    const ev = new CustomEvent('custom:test', { detail: { ok: true } });
    el.dispatchEvent(ev);

    const result = await promise;
    if (!(result instanceof Event)) {
      throw new Error(`Expected Event, got: ${result}`);
    }
    if (result.detail?.ok !== true) {
      throw new Error(`Expected detail.ok = true, got: ${JSON.stringify(result.detail)}`);
    }
  });

  it('should only fire the callback once', async () => {
    const el = document.createElement('div');
    let count = 0;

    const promise = once(el, 'count:test').then(() => count++);

    el.dispatchEvent(new CustomEvent('count:test'));
    el.dispatchEvent(new CustomEvent('count:test'));

    await promise;
    if (count !== 1) {
      throw new Error(`Expected count 1, got ${count}`);
    }
  });

  it('should reject with abort error when signal is aborted', async () => {
    const el = document.createElement('div');
    const ctrl = new AbortController();

    const promise = once(el, 'never:fires', { signal: ctrl.signal });
    ctrl.abort();

    let caught = null;
    try {
      await promise;
    } catch (err) {
      caught = err;
    }

    if (!caught) {
      throw new Error('Expected promise to reject on abort');
    }
    if (!caught.message.includes('abort')) {
      throw new Error(`Expected abort message, got: ${caught.message}`);
    }
  });

  it('should immediately reject when signal is pre-aborted', async () => {
    const el = document.createElement('div');
    const ctrl = new AbortController();
    ctrl.abort();

    let caught = null;
    try {
      await once(el, 'never:fires', { signal: ctrl.signal });
    } catch (err) {
      caught = err;
    }

    if (!caught) {
      throw new Error('Expected immediate rejection with pre-aborted signal');
    }
  });

  it('should clean up the abort listener after resolution', async () => {
    const el = document.createElement('div');
    const ctrl = new AbortController();
    let removeCount = 0;

    const original = ctrl.signal.removeEventListener.bind(ctrl.signal);
    ctrl.signal.removeEventListener = function(type, ...args) {
      if (type === 'abort') removeCount++;
      return original(type, ...args);
    };

    try {
      const promise = once(el, 'cleanup:test', { signal: ctrl.signal });
      el.dispatchEvent(new CustomEvent('cleanup:test'));
      await promise;

      if (removeCount < 1) {
        throw new Error(`Expected abort listener removed on resolution, removeCount=${removeCount}`);
      }
    } finally {
      ctrl.signal.removeEventListener = original;
    }
  });
});
