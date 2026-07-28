/**
 * tests/core/ui/transitions.test.js
 *
 * View Transitions: element-scoped dock path, document path, fallback,
 * reduced-motion, naming/control API, AbortSignal.
 */

import {
  transition,
  runSwapTransition,
  configureTransitions,
  getTransitionConfig,
  prefersReducedMotion,
  shouldAnimate,
  dockTransitionName,
  hasElementViewTransition
} from '../../../src/core/ui/transitions.js';
import { schedule, scheduleFrame, Priority } from '../../../src/core/ui/schedule.js';
import { ui } from '../../../src/core/ui/index.js';

function mockMatchMedia(reduced) {
  const prev = window.matchMedia;
  window.matchMedia = (query) => ({
    matches: reduced && String(query).includes('prefers-reduced-motion'),
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() { return false; }
  });
  return () => { window.matchMedia = prev; };
}

function stubElementVT(host, { fail = false, hold = false } = {}) {
  const calls = [];
  let skipFn = null;
  host.startViewTransition = (cb) => {
    calls.push(cb);
    if (fail) throw new Error('VT boom');
    let resolveFinished;
    const finished = new Promise((resolve) => { resolveFinished = resolve; });
    const tx = {
      finished,
      updateCallbackDone: Promise.resolve(),
      ready: Promise.resolve(),
      skipTransition() {
        resolveFinished();
      }
    };
    skipFn = () => tx.skipTransition();
    const run = () => {
      try {
        const res = cb();
        Promise.resolve(res).finally(() => {
          if (!hold) resolveFinished();
        });
      } catch (err) {
        resolveFinished();
        throw err;
      }
    };
    queueMicrotask(run);
    return tx;
  };
  return {
    calls,
    skip() { skipFn?.(); },
    restore() { delete host.startViewTransition; }
  };
}

describe('UI View Transitions', () => {
  let host;
  let restoreConfig;

  beforeEach(() => {
    host = document.createElement('dock-main');
    document.body.appendChild(host);
    restoreConfig = getTransitionConfig();
    configureTransitions({ enabled: true });
  });

  afterEach(() => {
    configureTransitions({
      enabled: restoreConfig.enabled,
      nameFor: restoreConfig.nameFor
    });
    host.remove();
    host = null;
  });

  it('dockTransitionName defaults to dock-<key>', () => {
    if (dockTransitionName(null, 'main') !== 'dock-main') {
      throw new Error(`Expected dock-main, got ${dockTransitionName(null, 'main')}`);
    }
    if (dockTransitionName(null, 'dock-docs') !== 'dock-docs') {
      throw new Error('Expected dock- prefix passthrough');
    }
    const named = document.createElement('div');
    named.setAttribute('view-transition-name', 'from-attr');
    if (dockTransitionName(named) !== 'from-attr') {
      throw new Error('Expected attribute-derived name');
    }
    named.dataset.transitionName = 'from-data';
    if (dockTransitionName(named) !== 'from-data') {
      throw new Error('Expected dataset-derived name');
    }
    const dockEl = document.createElement('div');
    if (dockTransitionName(dockEl, 'main') !== 'dock-main') {
      throw new Error(`Expected dockName hint → dock-main, got ${dockTransitionName(dockEl, 'main')}`);
    }
  });

  it('runSwapTransition uses element VT with named group and clears name', async () => {
    const stub = stubElementVT(host);
    const child = document.createElement('page-a');
    let nameDuring = '';

    await runSwapTransition(host, () => {
      nameDuring = host.style.viewTransitionName;
      host.replaceChildren(child);
    }, { dockName: 'main', direction: 'push' });

    if (stub.calls.length !== 1) {
      throw new Error('Expected element startViewTransition once');
    }
    if (nameDuring !== 'dock-main') {
      throw new Error(`Expected viewTransitionName dock-main during swap, got "${nameDuring}"`);
    }
    if (host.style.viewTransitionName !== '') {
      throw new Error('Expected viewTransitionName cleared after swap');
    }
    if (host.firstElementChild !== child) {
      throw new Error('Expected child mounted after swap');
    }
    stub.restore();
  });

  it('falls back to direct swap when element VT is missing', async () => {
    // Override prototype method if present (Chrome element-scoped VT).
    Object.defineProperty(host, 'startViewTransition', {
      value: undefined,
      configurable: true,
      writable: true
    });
    const child = document.createElement('page-b');
    await runSwapTransition(host, () => {
      host.replaceChildren(child);
    }, { dockName: 'content' });

    if (host.firstElementChild !== child) {
      throw new Error('Expected direct fallback swap');
    }
  });

  it('falls back when prefers-reduced-motion is reduce', async () => {
    const restoreMq = mockMatchMedia(true);
    const stub = stubElementVT(host);
    const child = document.createElement('page-c');

    if (!prefersReducedMotion()) {
      restoreMq();
      stub.restore();
      throw new Error('Expected prefersReducedMotion true under mock');
    }

    await runSwapTransition(host, () => {
      host.replaceChildren(child);
    }, { dockName: 'main' });

    if (stub.calls.length !== 0) {
      throw new Error('Expected VT skipped under reduced motion');
    }
    if (host.firstElementChild !== child) {
      throw new Error('Expected direct swap under reduced motion');
    }
    stub.restore();
    restoreMq();
  });

  it('falls back when startViewTransition throws', async () => {
    const stub = stubElementVT(host, { fail: true });
    const child = document.createElement('page-d');
    const prevWarn = console.warn;
    console.warn = () => {};

    await runSwapTransition(host, () => {
      host.replaceChildren(child);
    }, { dockName: 'main' });

    console.warn = prevWarn;

    if (host.firstElementChild !== child) {
      throw new Error('Expected fallback after VT failure');
    }
    stub.restore();
  });

  it('respects transition:false and name overrides', async () => {
    const stub = stubElementVT(host);
    await runSwapTransition(host, () => {
      host.replaceChildren(document.createElement('x-1'));
    }, { dockName: 'main', transition: false });

    if (stub.calls.length !== 0) {
      throw new Error('Expected skip when transition:false');
    }

    let nameDuring = '';
    await runSwapTransition(host, () => {
      nameDuring = host.style.viewTransitionName;
      host.replaceChildren(document.createElement('x-2'));
    }, { transition: { name: 'dock-content' } });

    if (nameDuring !== 'dock-content') {
      throw new Error(`Expected override name dock-content, got "${nameDuring}"`);
    }
    stub.restore();
  });

  it('configureTransitions({ enabled:false }) disables animation', async () => {
    configureTransitions({ enabled: false });
    const stub = stubElementVT(host);
    await runSwapTransition(host, () => {
      host.replaceChildren(document.createElement('x-off'));
    }, { dockName: 'main' });
    if (stub.calls.length !== 0) {
      throw new Error('Expected global disable to skip VT');
    }
    stub.restore();
  });

  it('AbortSignal skips in-flight element VT without leaking name', async () => {
    const stub = stubElementVT(host, { hold: true });
    const ctrl = new AbortController();

    const pending = runSwapTransition(host, () => {
      host.replaceChildren(document.createElement('x-abort'));
    }, { dockName: 'main', signal: ctrl.signal });

    await Promise.resolve();
    ctrl.abort();
    await pending;

    if (host.style.viewTransitionName !== '') {
      throw new Error('Expected name cleared after abort');
    }
    stub.restore();
  });

  it('document transition() falls back when unsupported', async () => {
    const prev = document.startViewTransition;
    Object.defineProperty(document, 'startViewTransition', {
      value: undefined,
      configurable: true,
      writable: true
    });

    let ran = false;
    const tx = await transition(() => { ran = true; });
    if (!ran) throw new Error('Expected callback to run');
    if (typeof tx.skipTransition !== 'function') {
      throw new Error('Expected skipTransition on fallback object');
    }
    await tx.finished;

    if (prev) {
      Object.defineProperty(document, 'startViewTransition', {
        value: prev,
        configurable: true,
        writable: true
      });
    } else {
      delete document.startViewTransition;
    }
  });

  it('shouldAnimate reflects scope and reduced motion', () => {
    const restoreMq = mockMatchMedia(true);
    if (shouldAnimate({ scope: 'document' })) {
      restoreMq();
      throw new Error('Expected shouldAnimate false under reduced motion');
    }
    restoreMq();

    if (shouldAnimate({ skip: true })) {
      throw new Error('Expected shouldAnimate false when skip');
    }
  });

  it('dock() swapView uses configured transition name', async () => {
    const tag = 'dock-vt-named';
    if (!customElements.get(tag)) {
      ui.dock('vt-named', {
        tag,
        parent: 'main',
        transition: { name: 'dock-content' }
      });
    }
    await customElements.whenDefined(tag);
    const el = document.createElement(tag);
    document.body.appendChild(el);

    let nameAtStart = '';
    el.startViewTransition = (cb) => {
      nameAtStart = el.style.viewTransitionName;
      const res = cb();
      return {
        finished: Promise.resolve(res),
        updateCallbackDone: Promise.resolve(res),
        ready: Promise.resolve(),
        skipTransition() {}
      };
    };

    await el.swapView(document.createElement('page-z'), { direction: 'push' });

    if (nameAtStart !== 'dock-content') {
      el.remove();
      throw new Error(`Expected dock-content from dock config, got "${nameAtStart}"`);
    }
    if (el.style.viewTransitionName !== '') {
      el.remove();
      throw new Error('Expected name cleared after dock swapView');
    }
    el.remove();
  });
});

describe('UI schedule AbortSignal', () => {
  it('schedule rejects when signal already aborted', async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    let rejected = false;
    try {
      await schedule(() => {}, { priority: Priority.VISIBLE, signal: ctrl.signal });
    } catch (err) {
      rejected = err?.name === 'AbortError';
    }
    if (!rejected) throw new Error('Expected AbortError from aborted schedule');
  });

  it('scheduleFrame rejects on abort before rAF fires', async () => {
    const ctrl = new AbortController();
    const p = scheduleFrame(() => 'ran', { signal: ctrl.signal });
    ctrl.abort();
    let rejected = false;
    try {
      await p;
    } catch (err) {
      rejected = err?.name === 'AbortError';
    }
    if (!rejected) throw new Error('Expected AbortError from aborted scheduleFrame');
  });

  it('schedule runs when not aborted', async () => {
    let ran = false;
    await schedule(() => { ran = true; }, { priority: Priority.BLOCKING });
    if (!ran) throw new Error('Expected schedule callback to run');
  });
});

describe('hasElementViewTransition helper', () => {
  it('detects stubbed element API', () => {
    const el = document.createElement('div');
    if (hasElementViewTransition(el)) {
      // Native support — still valid
      return;
    }
    el.startViewTransition = () => ({});
    if (!hasElementViewTransition(el)) {
      throw new Error('Expected helper to detect startViewTransition');
    }
  });
});
