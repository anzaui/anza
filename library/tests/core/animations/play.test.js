/**
 * tests/core/animations/play.test.js
 *
 * Core WAAPI animation execution engine test suite.
 *
 * Source: plan.md Phase 6-A, core/animations/play.js
 */

import { animate, stagger } from '@anzaui/anza/animations';

describe('WAAPI Animation Engine', () => {
  let el;

  beforeEach(() => {
    el = document.createElement('div');
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
  });

  it('should successfully trigger a standard WAAPI animation on DOM elements', () => {
    const keyframes = [{ opacity: 0 }, { opacity: 1 }];
    const anim = animate(el, keyframes, { duration: 100 });

    if (!anim || typeof anim.cancel !== 'function') {
      throw new Error('Failed to create a valid browser Animation object');
    }
    if (anim.playState !== 'running' && anim.playState !== 'pending') {
      throw new Error(`Expected animation state running/pending, got: ${anim.playState}`);
    }

    anim.cancel();
  });

  it('should immediately cancel active WAAPI loops when AbortSignal fires', () => {
    const keyframes = [{ opacity: 0 }, { opacity: 1 }];
    const abortCtrl = new AbortController();
    const anim = animate(el, keyframes, { duration: 500, signal: abortCtrl.signal });

    // Instantly abort
    abortCtrl.abort();

    if (anim.playState !== 'idle') {
      throw new Error(`Expected animation to be idle after cancel, got: ${anim.playState}`);
    }
  });

  it('should support staggered sequences and delegate group controls', async () => {
    const el1 = document.createElement('span');
    const el2 = document.createElement('span');
    document.body.appendChild(el1);
    document.body.appendChild(el2);

    try {
      const keyframes = [{ transform: 'scale(1)' }, { transform: 'scale(1.2)' }];
      const group = stagger([el1, el2], keyframes, { duration: 10, staggerDelay: 30 });

      if (group.animations.length !== 2) {
        throw new Error(`Expected 2 animations, got ${group.animations.length}`);
      }

      // Verify delay progression
      const delay1 = group.animations[0].effect.getTiming().delay || 0;
      const delay2 = group.animations[1].effect.getTiming().delay || 0;

      if (delay2 - delay1 !== 30) {
        throw new Error(`Expected delay gap of 30ms, got ${delay2 - delay1}ms`);
      }

      // Fast-forward animation completion (bypasses browser headless tab throttling)
      group.finish();
      await group.finished;

      if (group.animations[0].playState !== 'finished' || group.animations[1].playState !== 'finished') {
        throw new Error('Expected animations to be in finished state');
      }
    } finally {
      el1.remove();
      el2.remove();
    }
  });
});
