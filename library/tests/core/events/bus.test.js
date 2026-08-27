/**
 * tests/core/events/bus.test.js
 *
 * Core event bus subscription execution test suite.
 *
 * Source: plan.md Phase 6-A, core/events/bus.js
 */

import { bus, EventBus } from '@anzaui/anza/events';

describe('Global Event Bus', () => {
  it('should register listeners and emit custom events with payload details', () => {
    const localBus = new EventBus();
    let fired = false;
    let eventDetail = null;

    localBus.on('user:login', (e) => {
      fired = true;
      eventDetail = e.detail;
    });

    localBus.emit('user:login', { id: 100, name: 'fescii' });

    if (!fired) {
      throw new Error('Expected event listener to fire');
    }
    if (!eventDetail || eventDetail.id !== 100 || eventDetail.name !== 'fescii') {
      throw new Error(`Expected custom event payload, got ${JSON.stringify(eventDetail)}`);
    }
  });

  it('should unregister event listeners via manually called disposers', () => {
    const localBus = new EventBus();
    let count = 0;

    const dispose = localBus.on('tick', () => {
      count++;
    });

    localBus.emit('tick');
    if (count !== 1) {
      throw new Error(`Expected count 1, got ${count}`);
    }

    dispose();
    localBus.emit('tick');
    if (count !== 1) {
      throw new Error(`Expected count to remain at 1 after dispose, got ${count}`);
    }
  });

  it('should unregister event listeners automatically on AbortSignal events', () => {
    const localBus = new EventBus();
    const abortCtrl = new AbortController();
    let count = 0;

    localBus.on('tick', () => {
      count++;
    }, abortCtrl.signal);

    localBus.emit('tick');
    if (count !== 1) {
      throw new Error(`Expected count 1, got ${count}`);
    }

    // Abort the subscription
    abortCtrl.abort();

    localBus.emit('tick');
    if (count !== 1) {
      throw new Error(`Expected count to remain at 1 after abort, got ${count}`);
    }
  });
});
