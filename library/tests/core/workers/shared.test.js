/**
 * tests/core/workers/shared.test.js
 *
 * SharedConnection: connect, send, subscribe, close, listener isolation.
 * Source: plan.md Phase 4 — Test Matrix
 */

import { Shared } from '@anzaui/anza/workers';

describe('Shared Worker Connection', () => {
  let savedShared;
  let savedWorker;

  beforeEach(() => {
    savedShared = globalThis.SharedWorker;
    savedWorker = globalThis.Worker;
  });

  afterEach(() => {
    globalThis.SharedWorker = savedShared;
    globalThis.Worker = savedWorker;
  });

  // -------------------------------------------------------------------------
  it('connect: uses SharedWorker when available', () => {
    let portStarted = false;

    globalThis.SharedWorker = class {
      constructor() {
        this.port = {
          onmessage: null,
          onmessageerror: null,
          start() { portStarted = true; },
          postMessage() {},
          close() {}
        };
      }
    };

    const conn = new Shared('/sw.js', 'test');
    conn.connect();

    if (!portStarted) throw new Error('Expected port.start() to be called');
    conn.close();
  });

  // -------------------------------------------------------------------------
  it('connect: falls back to dedicated worker when SharedWorker absent', () => {
    globalThis.SharedWorker = undefined;
    let spawnedDedicated = false;

    globalThis.Worker = class {
      constructor() { spawnedDedicated = true; }
      addEventListener() {}
      postMessage() {}
      terminate() {}
      set onmessage(_) {}
      set onmessageerror(_) {}
    };

    const conn = new Shared('/sw.js', 'fallback');
    conn.connect();

    if (!spawnedDedicated) throw new Error('Expected dedicated worker fallback');
    conn.close();
  });

  // -------------------------------------------------------------------------
  it('subscribe: receives dispatched messages', (done) => {
    globalThis.SharedWorker = undefined;

    let capturedOnMessage;
    globalThis.Worker = class {
      constructor() {}
      addEventListener() {}
      postMessage() {}
      terminate() {}
      set onmessage(fn) { capturedOnMessage = fn; }
      set onmessageerror(_) {}
    };

    const conn = new Shared('/sw.js');
    conn.connect();

    conn.subscribe((msg) => {
      if (msg.x !== 1) done(new Error(`Expected x:1, got ${JSON.stringify(msg)}`));
      else done();
      conn.close();
    });

    // Simulate an inbound message from the worker
    capturedOnMessage({ data: { x: 1 } });
  });

  // -------------------------------------------------------------------------
  it('subscribe: isolates listener errors', (done) => {
    globalThis.SharedWorker = undefined;

    let capturedOnMessage;
    globalThis.Worker = class {
      constructor() {}
      addEventListener() {}
      postMessage() {}
      terminate() {}
      set onmessage(fn) { capturedOnMessage = fn; }
      set onmessageerror(_) {}
    };

    const conn = new Shared('/sw.js');
    conn.connect();

    // First listener throws — second must still run
    conn.subscribe(() => { throw new Error('intentional listener error'); });
    conn.subscribe(() => done());

    capturedOnMessage({ data: {} });
  });

  // -------------------------------------------------------------------------
  it('close: removes all listeners and marks closed', () => {
    globalThis.SharedWorker = undefined;
    globalThis.Worker = class {
      constructor() {}
      addEventListener() {}
      postMessage() {}
      terminate() {}
      set onmessage(_) {}
      set onmessageerror(_) {}
    };

    const conn = new Shared('/sw.js');
    conn.connect();

    let called = false;
    conn.subscribe(() => { called = true; });
    conn.close();

    if (!conn.closed) throw new Error('Expected conn.closed === true');
    if (called) throw new Error('Listener should not be called after close');
  });

  // -------------------------------------------------------------------------
  it('subscribe: abort signal removes listener', () => {
    globalThis.SharedWorker = undefined;

    let capturedOnMessage;
    globalThis.Worker = class {
      constructor() {}
      addEventListener() {}
      postMessage() {}
      terminate() {}
      set onmessage(fn) { capturedOnMessage = fn; }
      set onmessageerror(_) {}
    };

    const conn = new Shared('/sw.js');
    conn.connect();

    const ac = new AbortController();
    let called = false;
    conn.subscribe(() => { called = true; }, ac.signal);
    ac.abort();

    capturedOnMessage({ data: {} });

    if (called) throw new Error('Listener should have been removed on abort');
    conn.close();
  });
});
