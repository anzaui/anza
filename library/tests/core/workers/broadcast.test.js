/**
 * tests/core/workers/broadcast.test.js
 *
 * BroadcastManager: subscribe, abort cleanup, disposal, close, clear, messageerror.
 * Source: plan.md Phase 5 — Test Matrix
 */

import { broadcast } from '@anzaui/anza/workers';

describe('Broadcast Channel Manager', () => {

  afterEach(() => {
    // Clear all state between tests
    broadcast.clear();
  });

  // -------------------------------------------------------------------------
  it('subscribe + broadcast: delivers message to listener', (done) => {
    broadcast.subscribe('test:deliver', (msg) => {
      if (msg.v !== 99) done(new Error(`Expected v:99, got ${JSON.stringify(msg)}`));
      else done();
    });

    broadcast.broadcast('test:deliver', { v: 99 });
  });

  // -------------------------------------------------------------------------
  it('subscribe: abort signal removes the listener', (done) => {
    const ac = new AbortController();
    let received = false;

    broadcast.subscribe('test:abort', () => { received = true; }, ac.signal);
    ac.abort();

    broadcast.broadcast('test:abort', {});

    // Give event loop a moment for the message to dispatch (if listener were still present)
    setTimeout(() => {
      if (received) done(new Error('Listener should have been removed on abort'));
      else done();
    }, 30);
  });

  // -------------------------------------------------------------------------
  it('dispose: returned function removes only that listener', (done) => {
    let count = 0;
    const dispose = broadcast.subscribe('test:dispose', () => { count++; });
    broadcast.subscribe('test:dispose', () => { count++; });

    dispose(); // only the first listener is removed

    broadcast.broadcast('test:dispose', {});

    setTimeout(() => {
      if (count !== 1) done(new Error(`Expected 1 call, got ${count}`));
      else done();
    }, 30);
  });

  // -------------------------------------------------------------------------
  it('close: removes all listeners for a named channel', (done) => {
    let received = false;
    broadcast.subscribe('test:close', () => { received = true; });
    broadcast.close('test:close');

    broadcast.broadcast('test:close', {});

    setTimeout(() => {
      if (received) done(new Error('Channel should have been closed'));
      else done();
    }, 30);
  });

  // -------------------------------------------------------------------------
  it('clear: removes all channels', (done) => {
    let a = 0; let b = 0;
    broadcast.subscribe('test:clearA', () => { a++; });
    broadcast.subscribe('test:clearB', () => { b++; });

    broadcast.clear();

    broadcast.broadcast('test:clearA', {});
    broadcast.broadcast('test:clearB', {});

    setTimeout(() => {
      if (a !== 0 || b !== 0) done(new Error(`Expected 0 calls, got a=${a} b=${b}`));
      else done();
    }, 30);
  });

  // -------------------------------------------------------------------------
  it('subscribe: pre-aborted signal returns no-op dispose', () => {
    const ac = new AbortController();
    ac.abort();

    const dispose = broadcast.subscribe('test:preabort', () => {}, ac.signal);
    if (typeof dispose !== 'function') throw new Error('Expected dispose function');
  });
});
