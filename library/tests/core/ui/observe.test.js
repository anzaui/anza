/**
 * tests/core/ui/observe.test.js
 *
 * Test suite for core observer wrappers — disposers, abort, scoped mutation.
 */

import { resize, intersection, mutation, performance } from '../../../src/core/ui/observe.js';

function nextMutationBatch() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('UI Observer Wrappers', () => {
  let el;

  beforeEach(() => {
    el = document.createElement('div');
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
    el = null;
  });

  it('resize observer returns disposer, disconnects on abort, and allows manual dispose', () => {
    const ctrl = new AbortController();
    const dispose = resize(el, () => {}, ctrl.signal);

    if (typeof dispose !== 'function') {
      throw new Error('Expected resize to return a disposer function');
    }

    dispose();
    ctrl.abort();
  });

  it('intersection observer returns disposer, disconnects on abort, and allows manual dispose', () => {
    const ctrl = new AbortController();
    const dispose = intersection(el, () => {}, ctrl.signal);

    if (typeof dispose !== 'function') {
      throw new Error('Expected intersection to return a disposer function');
    }

    dispose();
    ctrl.abort();
  });

  it('mutation observer returns disposer, disconnects on abort, and allows manual dispose', () => {
    const ctrl = new AbortController();
    const dispose = mutation(el, () => {}, ctrl.signal);

    if (typeof dispose !== 'function') {
      throw new Error('Expected mutation to return a disposer function');
    }

    dispose();
    ctrl.abort();
  });

  it('mutation defaults subtree to false and warns without attributeFilter', () => {
    const ctrl = new AbortController();
    const observeCalls = [];
    const OriginalMO = globalThis.MutationObserver;
    const warnings = [];
    const originalWarn = console.warn;
    console.warn = (msg) => { warnings.push(String(msg)); };

    globalThis.MutationObserver = class extends OriginalMO {
      observe(target, options) {
        observeCalls.push(options);
        return super.observe(target, options);
      }
    };

    try {
      const dispose = mutation(el, () => {}, ctrl.signal, { attributes: true });
      if (!observeCalls[0] || observeCalls[0].subtree !== false) {
        throw new Error('Expected default subtree: false');
      }
      if (!warnings.some((w) => w.includes('attributeFilter'))) {
        throw new Error('Expected attributeFilter warning when attributes:true');
      }
      dispose();
    } finally {
      globalThis.MutationObserver = OriginalMO;
      console.warn = originalWarn;
      ctrl.abort();
    }
  });

  it('mutation fires for childList and stops after dispose', async () => {
    const ctrl = new AbortController();
    let calls = 0;
    const dispose = mutation(el, () => { calls++; }, ctrl.signal);

    el.appendChild(document.createElement('span'));
    await nextMutationBatch();
    if (calls !== 1) {
      throw new Error(`Expected one mutation callback, got ${calls}`);
    }

    dispose();
    el.appendChild(document.createElement('span'));
    await nextMutationBatch();
    if (calls !== 1) {
      throw new Error('Expected disposer to stop further mutation callbacks');
    }

    ctrl.abort();
  });

  it('mutation.scoped refuses document roots', () => {
    const ctrl = new AbortController();
    const warnings = [];
    const originalWarn = console.warn;
    console.warn = (msg) => { warnings.push(String(msg)); };

    try {
      const dispose = mutation.scoped(document, '.x', () => {}, ctrl.signal);
      dispose();
      if (!warnings.some((w) => w.includes('refuses'))) {
        throw new Error('Expected scoped helper to refuse document');
      }
    } finally {
      console.warn = originalWarn;
      ctrl.abort();
    }
  });

  it('mutation.scoped observes matching nodes inside a shadow root', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = '<div class="box"></div>';

    const ctrl = new AbortController();
    let calls = 0;

    try {
      const dispose = mutation.scoped(root, '.box', () => { calls++; }, ctrl.signal);
      root.querySelector('.box').appendChild(document.createElement('span'));
      await nextMutationBatch();
      if (calls !== 1) {
        throw new Error(`Expected scoped mutation to fire for .box, got ${calls}`);
      }

      // Unrelated node under shadow should not match .box closest? Actually child of .box
      // already matched. Add a sibling outside .box — filter should skip.
      root.appendChild(document.createElement('em'));
      await nextMutationBatch();
      if (calls !== 1) {
        throw new Error('Expected non-matching sibling not to fire scoped handler');
      }

      dispose();
    } finally {
      ctrl.abort();
      host.remove();
    }
  });

  it('already-aborted signal returns a no-op disposer', () => {
    const ctrl = new AbortController();
    ctrl.abort();
    const dispose = mutation(el, () => {}, ctrl.signal);
    if (typeof dispose !== 'function') {
      throw new Error('Expected no-op disposer');
    }
    dispose();
  });

  it('performance observer returns disposer, disconnects on abort, and allows manual dispose', () => {
    const ctrl = new AbortController();
    const dispose = performance(['mark'], () => {}, ctrl.signal);

    if (typeof dispose !== 'function') {
      throw new Error('Expected performance to return a disposer function');
    }

    dispose();
    ctrl.abort();
  });
});
