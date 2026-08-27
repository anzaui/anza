/**
 * tests/core/events/listen.test.js
 *
 * Unit tests for the memory-safe passive listener aggregator.
 */

import { listen, names } from '@anzaui/anza/events';

describe('Event Listener Aggregator', () => {
  it('should successfully subscribe and unsubscribe from events', () => {
    const el = document.createElement('div');
    let count = 0;

    const dispose = listen(el, 'click', () => {
      count++;
    });

    el.dispatchEvent(new CustomEvent('click'));
    if (count !== 1) {
      throw new Error(`Expected click count 1, got ${count}`);
    }

    // Unsubscribe
    dispose();
    el.dispatchEvent(new CustomEvent('click'));
    if (count !== 1) {
      throw new Error(`Expected click count to remain 1 after dispose, got ${count}`);
    }
  });

  it('should respect AbortSignal cleanups', () => {
    const el = document.createElement('div');
    const abortCtrl = new AbortController();
    let count = 0;

    listen(el, 'click', () => {
      count++;
    }, { signal: abortCtrl.signal });

    el.dispatchEvent(new CustomEvent('click'));
    if (count !== 1) {
      throw new Error(`Expected count 1, got ${count}`);
    }

    abortCtrl.abort();
    el.dispatchEvent(new CustomEvent('click'));
    if (count !== 1) {
      throw new Error(`Expected count to remain 1 after abort, got ${count}`);
    }
  });

  it('should clean up AbortSignal listeners on manual disposer call to prevent memory leaks', () => {
    const el = document.createElement('div');
    const abortCtrl = new AbortController();
    let abortRemoved = false;

    const originalRemove = abortCtrl.signal.removeEventListener;
    abortCtrl.signal.removeEventListener = function(type, listener, options) {
      if (type === 'abort') {
        abortRemoved = true;
      }
      originalRemove.call(abortCtrl.signal, type, listener, options);
    };

    try {
      const dispose = listen(el, 'click', () => {}, { signal: abortCtrl.signal });
      dispose();

      if (!abortRemoved) {
        throw new Error('Expected abort event listener to be removed from signal on manual dispose');
      }
    } finally {
      abortCtrl.signal.removeEventListener = originalRemove;
    }
  });

  it('should default touch and wheel events to passive: true', () => {
    const el = document.createElement('div');
    let optionsPassed = null;

    const originalAdd = el.addEventListener;
    el.addEventListener = function(type, listener, options) {
      optionsPassed = options;
      originalAdd.call(el, type, listener, options);
    };

    try {
      listen(el, 'wheel', () => {});
      if (!optionsPassed || optionsPassed.passive !== true) {
        throw new Error('Expected wheel event to be registered as passive: true');
      }

      listen(el, 'click', () => {});
      if (optionsPassed && optionsPassed.passive === true) {
        throw new Error('Expected click event NOT to be registered as passive');
      }
    } finally {
      el.addEventListener = originalAdd;
    }
  });

  it('should expose system event name constants', () => {
    if (!names.auth.signedin || names.auth.signedin !== 'auth:signedin') {
      throw new Error('Expected auth:signedin system name mapping');
    }
    if (!names.connectivity.online || names.connectivity.online !== 'connectivity:online') {
      throw new Error('Expected connectivity:online system name mapping');
    }
  });

  it('should propagate once:true option to native addEventListener', () => {
    const el = document.createElement('div');
    let count = 0;

    listen(el, 'test:once', () => { count++; }, { once: true });

    el.dispatchEvent(new CustomEvent('test:once'));
    el.dispatchEvent(new CustomEvent('test:once'));

    if (count !== 1) {
      throw new Error(`Expected once:true to fire listener exactly once, got count=${count}`);
    }
  });

  it('should propagate capture:true option to native addEventListener', () => {
    const parent = document.createElement('div');
    const child = document.createElement('span');
    parent.appendChild(child);
    document.body.appendChild(parent);

    let capturedPhase = null;
    const optsPassed = {};

    const originalAdd = parent.addEventListener.bind(parent);
    parent.addEventListener = function(type, fn, opts) {
      Object.assign(optsPassed, typeof opts === 'object' ? opts : { capture: !!opts });
      return originalAdd(type, fn, opts);
    };

    try {
      listen(parent, 'test:capture', (e) => {
        capturedPhase = e.eventPhase;
      }, { capture: true });

      if (!optsPassed.capture) {
        throw new Error('Expected capture:true to be passed to addEventListener');
      }
    } finally {
      parent.addEventListener = originalAdd;
      document.body.removeChild(parent);
    }
  });
});
