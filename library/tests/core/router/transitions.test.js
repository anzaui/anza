/**
 * tests/core/router/transitions.test.js
 *
 * Test suite for same-document CSS View Transitions and shared-element morphing.
 *
 * Source: plan.md §8
 */

import { transitions } from '../../../src/core/router/transitions.js';

describe('View Transitions wrapper', () => {
  let element;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  afterEach(() => {
    element.remove();
  });

  it('should execute DOM mutations successfully', async () => {
    let mutated = false;
    await transitions.run(async () => {
      mutated = true;
    });

    if (!mutated) {
      throw new Error('Expected updateDOM callback to be executed');
    }
  });

  it('should transiently apply and clear viewTransitionName on sourceElement', async () => {
    let nameCheckedDuringMutation = '';

    await transitions.run(
      async () => {
        nameCheckedDuringMutation = element.style.viewTransitionName;
      },
      { sourceElement: element, name: 'custom-card' }
    );

    if (element.style.viewTransitionName !== '') {
      throw new Error(`Expected viewTransitionName to be cleared, got "${element.style.viewTransitionName}"`);
    }

    if (typeof document.startViewTransition === 'function') {
      if (nameCheckedDuringMutation !== 'custom-card') {
        throw new Error(`Expected viewTransitionName to be "custom-card" during update, got "${nameCheckedDuringMutation}"`);
      }
    }
  });

  it('should skip document VT under reduced motion', async () => {
    const prev = window.matchMedia;
    window.matchMedia = (query) => ({
      matches: String(query).includes('prefers-reduced-motion'),
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent() { return false; }
    });

    let calls = 0;
    const real = document.startViewTransition;
    document.startViewTransition = () => {
      calls += 1;
      return {
        finished: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
        ready: Promise.resolve(),
        skipTransition() {}
      };
    };

    let ran = false;
    await transitions.run(() => { ran = true; });

    window.matchMedia = prev;
    if (real) document.startViewTransition = real;
    else delete document.startViewTransition;

    if (!ran) throw new Error('Expected update to run');
    if (calls !== 0) throw new Error('Expected document VT skipped under reduced motion');
  });

  it('exposes dock naming helper', () => {
    if (transitions.dockName(null, 'docs') !== 'dock-docs') {
      throw new Error('Expected transitions.dockName to map docs → dock-docs');
    }
  });
});
