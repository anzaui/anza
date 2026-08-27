/**
 * tests/core/state/derived.test.js
 *
 * Core derived state computations execution test suite.
 *
 * Source: plan.md Phase 6-A, core/state/derived.js
 */

import { derived, ReactiveStore } from '@anzaui/anza/state';

describe('Derived Reactive Computations', () => {
  it('should evaluate computations lazily and memoize results', () => {
    const store = new ReactiveStore({ count: 5 });
    let computeCount = 0;

    const doubled = derived(() => {
      computeCount++;
      return store.get('count') * 2;
    });

    if (computeCount !== 0) {
      throw new Error('Expected 0 compute iterations before accessing value');
    }

    if (doubled.value !== 10) {
      throw new Error(`Expected doubled value 10, got ${doubled.value}`);
    }
    if (computeCount !== 1) {
      throw new Error(`Expected 1 compute iteration on access, got ${computeCount}`);
    }

    // Access second time to verify memoization
    const checkVal = doubled.value;
    if (computeCount !== 1) {
      throw new Error(`Expected memoization to skip recomputation, computeCount is ${computeCount}`);
    }
  });

  it('should reactively invalidate and mark dirty when dependencies mutate', async () => {
    const store = new ReactiveStore({ text: 'world' });
    let computeCount = 0;
    let triggers = 0;

    const greeting = derived(() => {
      computeCount++;
      return `Hello ${store.get('text')}`;
    });

    greeting.subscribe(() => {
      triggers++;
    });

    if (greeting.value !== 'Hello world') {
      throw new Error('Greeting matched incorrect computed values');
    }

    store.set('text', 'everyone');
    // Store triggers are asynchronous (microtask-batched), so await microtask completion
    await new Promise((resolve) => queueMicrotask(resolve));

    if (triggers !== 1) {
      throw new Error(`Expected 1 derived trigger notification, got ${triggers}`);
    }

    // Getting the value after invalidation will lazily re-compute
    if (greeting.value !== 'Hello everyone') {
      throw new Error(`Expected updated greeting value, got "${greeting.value}"`);
    }
    if (computeCount !== 2) {
      throw new Error(`Expected 2 compute iterations, got ${computeCount}`);
    }
  });

  it('should release dependency subscriptions upon explicit disposal', async () => {
    const store = new ReactiveStore({ value: 100 });
    let computeCount = 0;

    const comp = derived(() => {
      computeCount++;
      return store.get('value') + 1;
    });

    comp.value;
    comp.dispose();

    store.set('value', 200);
    await new Promise((resolve) => queueMicrotask(resolve));

    // After dispose, mutations should not trigger computed invalidation/recomputation
    if (computeCount !== 1) {
      throw new Error('Expected computeCount to remain unchanged after store mutation on disposed derivation');
    }
  });
});
