/**
 * tests/core/platform/scheduler.test.js
 *
 * Prioritized scheduler and yielding polyfill test suite.
 *
 * Source: plan.md Phase 6-A, core/platform/polyfills/scheduler.js
 */

import { guard } from '@anzaui/anza/platform';

describe('Prioritized Task Scheduler', () => {
  let scheduler;

  before(async () => {
    scheduler = await guard.scheduler();
  });

  it('should run tasks enqueued with different priorities in correct chronological priority order', (done) => {
    const runs = [];

    // Enqueue in reverse order of expected execution
    scheduler.postTask(() => { runs.push('background'); }, { priority: 'background' });
    scheduler.postTask(() => { runs.push('user-visible'); }, { priority: 'user-visible' });
    scheduler.postTask(() => { runs.push('user-blocking'); }, { priority: 'user-blocking' });

    // Since they are scheduled as microtasks/macrotasks, wait briefly to verify execution order
    setTimeout(() => {
      try {
        if (runs[0] !== 'user-blocking' || runs[1] !== 'user-visible' || runs[2] !== 'background') {
          throw new Error(`Invalid priority execution order: ${runs.join(', ')}`);
        }
        done();
      } catch (err) {
        done(err);
      }
    }, 100);
  });

  it('should execute tasks of the same priority in FIFO order', (done) => {
    const runs = [];

    scheduler.postTask(() => { runs.push(1); }, { priority: 'user-visible' });
    scheduler.postTask(() => { runs.push(2); }, { priority: 'user-visible' });
    scheduler.postTask(() => { runs.push(3); }, { priority: 'user-visible' });

    setTimeout(() => {
      try {
        if (runs[0] !== 1 || runs[1] !== 2 || runs[2] !== 3) {
          throw new Error(`Invalid FIFO execution order: ${runs.join(', ')}`);
        }
        done();
      } catch (err) {
        done(err);
      }
    }, 100);
  });

  it('should support delayed task execution', (done) => {
    let executed = false;

    scheduler.postTask(() => {
      executed = true;
    }, { delay: 50 });

    setTimeout(() => {
      try {
        if (executed) {
          throw new Error('Task executed too early');
        }
      } catch (err) {
        done(err);
      }
    }, 20);

    setTimeout(() => {
      try {
        if (!executed) {
          throw new Error('Task failed to execute after delay');
        }
        done();
      } catch (err) {
        done(err);
      }
    }, 80);
  });

  it('should respect AbortSignal to cancel pending tasks before execution', (done) => {
    const controller = new AbortController();
    let executed = false;

    const promise = scheduler.postTask(() => {
      executed = true;
    }, { priority: 'user-visible', signal: controller.signal });

    controller.abort();

    promise.then(
      () => {
        done(new Error('Expected aborted task promise to reject'));
      },
      (err) => {
        try {
          if (err.name !== 'AbortError') {
            throw new Error(`Expected AbortError, got: ${err.name}`);
          }
          if (executed) {
            throw new Error('Aborted task was executed');
          }
          done();
        } catch (fail) {
          done(fail);
        }
      }
    );
  });

  it('should immediately reject if AbortSignal is already aborted', (done) => {
    const controller = new AbortController();
    controller.abort();

    scheduler.postTask(() => {}, { signal: controller.signal }).then(
      () => {
        done(new Error('Expected already-aborted task to reject immediately'));
      },
      (err) => {
        try {
          if (err.name !== 'AbortError') {
            throw new Error(`Expected AbortError, got: ${err.name}`);
          }
          done();
        } catch (fail) {
          done(fail);
        }
      }
    );
  });

  it('should successfully yield control back to the event loop using yield', async () => {
    let step = 0;

    scheduler.postTask(async () => {
      step = 1;
      await scheduler.yield();
      step = 3;
    });

    scheduler.postTask(() => {
      if (step === 1) {
        step = 2; // Should execute between yield resume
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 80));

    if (step !== 3) {
      throw new Error(`Yield task sequencing failed, final step: ${step}`);
    }
  });
});
