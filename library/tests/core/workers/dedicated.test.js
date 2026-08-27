/**
 * tests/core/workers/dedicated.test.js
 *
 * Dedicated worker: run, abort, timeout, error, messageerror, transferables.
 * Source: plan.md Phase 2 — Test Matrix
 */

import { Dedicated } from '@anzaui/anza/workers';

// ---------------------------------------------------------------------------
// Mock Worker
// ---------------------------------------------------------------------------

const originalWorker = globalThis.Worker;

function mockWorkerClass(handler) {
  return class MockWorker {
    constructor() {
      this.terminated = false;
      this._errorListeners = [];
      this._msgErrListeners = [];
    }
    addEventListener(type, fn) {
      if (type === 'error') this._errorListeners.push(fn);
      if (type === 'messageerror') this._msgErrListeners.push(fn);
    }
    fireError(msg) {
      const e = new ErrorEvent('error', { message: msg });
      for (const fn of this._errorListeners) fn(e);
    }
    postMessage(msg) { handler(this, msg); }
    terminate() { this.terminated = true; }
  };
}

describe('Dedicated Worker', () => {

  afterEach(() => {
    globalThis.Worker = originalWorker;
  });

  // -------------------------------------------------------------------------
  it('run: resolves on ok response', async () => {
    globalThis.Worker = mockWorkerClass((_w, { port }) => {
      setTimeout(() => port.postMessage({ ok: true, value: 42 }), 5);
    });

    const w = new Dedicated('/mock.js');
    const result = await w.run('add', { payload: 2 });

    if (result !== 42) throw new Error(`Expected 42, got ${result}`);
    w.terminate();
  });

  // -------------------------------------------------------------------------
  it('run: rejects on ok=false response', async () => {
    globalThis.Worker = mockWorkerClass((_w, { port }) => {
      setTimeout(() => port.postMessage({ ok: false, error: 'bad input' }), 5);
    });

    const w = new Dedicated('/mock.js');
    let caught = null;
    try { await w.run('bad'); } catch (e) { caught = e; }

    if (!caught?.message?.includes('bad input')) {
      throw new Error(`Expected "bad input" error, got: ${caught?.message}`);
    }
    w.terminate();
  });

  // -------------------------------------------------------------------------
  it('run: rejects via pre-aborted signal', async () => {
    globalThis.Worker = mockWorkerClass(() => {});
    const w = new Dedicated('/mock.js');
    const ac = new AbortController();
    ac.abort();

    let caught = null;
    try { await w.run('noop', { signal: ac.signal }); } catch (e) { caught = e; }

    if (caught?.name !== 'AbortError') throw new Error(`Expected AbortError, got: ${caught?.name}`);
    w.terminate();
  });

  // -------------------------------------------------------------------------
  it('run: rejects via signal abort during request', async () => {
    globalThis.Worker = mockWorkerClass(() => {}); // worker never responds
    const w = new Dedicated('/mock.js');
    const ac = new AbortController();

    const p = w.run('slow', { signal: ac.signal });
    setTimeout(() => ac.abort(), 10);

    let caught = null;
    try { await p; } catch (e) { caught = e; }

    if (!caught) throw new Error('Expected rejection from abort');
    w.terminate();
  });

  // -------------------------------------------------------------------------
  it('run: rejects via timeout', async () => {
    globalThis.Worker = mockWorkerClass(() => {}); // worker never responds
    const w = new Dedicated('/mock.js');

    let caught = null;
    try { await w.run('slow', { timeout: 30 }); } catch (e) { caught = e; }

    if (!caught?.message?.includes('timed out')) {
      throw new Error(`Expected timeout error, got: ${caught?.message}`);
    }
    w.terminate();
  });

  // -------------------------------------------------------------------------
  it('run: rejects closed worker immediately', async () => {
    globalThis.Worker = mockWorkerClass(() => {});
    const w = new Dedicated('/mock.js');
    w.terminate();

    let caught = null;
    try { await w.run('noop'); } catch (e) { caught = e; }

    if (!caught?.message?.includes('closed')) {
      throw new Error(`Expected closed error, got: ${caught?.message}`);
    }
  });
});
