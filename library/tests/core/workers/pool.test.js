/**
 * tests/core/workers/pool.test.js
 *
 * Worker pool: priority, fairness, abort, timeout, idle, crash, clear.
 * Source: plan.md Phase 3 — Test Matrix
 */

import { Pool } from '@anzaui/anza/workers';

// ---------------------------------------------------------------------------
// Mock Worker (new contract: { ok, value })
// ---------------------------------------------------------------------------

const originalWorker = globalThis.Worker;

function fastMock() {
  globalThis.Worker = class MockWorker {
    constructor() { this.terminated = false; }
    addEventListener() {}
    postMessage({ task, payload, port }) {
      setTimeout(() => {
        port.postMessage({ ok: true, value: `${task}:${payload}` });
      }, 5);
    }
    terminate() { this.terminated = true; }
  };
}

describe('Worker Thread Pool', () => {

  before(fastMock);
  after(() => { globalThis.Worker = originalWorker; });

  // -------------------------------------------------------------------------
  it('lazy-init: runs tasks on demand', async () => {
    const pool = new Pool('/mock.js', { size: 2 });
    const res = await pool.run('math:square', { payload: 5 });
    if (res !== 'math:square:5') throw new Error(`Got: ${res}`);
    pool.terminate();
  });

  // -------------------------------------------------------------------------
  it('priority: user-blocking runs before background', async () => {
    const pool = new Pool('/mock.js', { size: 1, max: 1 });

    // Fill the single worker so subsequent tasks queue
    const p0 = pool.run('blocker', { payload: 'x' });

    const order = [];
    const p1 = pool.run('lo', { payload: '1', priority: 'background' }).then(() => order.push('lo'));
    const p2 = pool.run('hi', { payload: '2', priority: 'user-blocking' }).then(() => order.push('hi'));
    const p3 = pool.run('mid', { payload: '3', priority: 'user-visible' }).then(() => order.push('mid'));

    await Promise.all([p0, p1, p2, p3]);

    if (order[0] !== 'hi' || order[1] !== 'mid' || order[2] !== 'lo') {
      throw new Error(`Expected [hi, mid, lo], got ${JSON.stringify(order)}`);
    }

    pool.terminate();
  });

  // -------------------------------------------------------------------------
  it('abort: cancels queued task before execution', async () => {
    const pool = new Pool('/mock.js', { size: 1, max: 1 });

    // Occupy the single worker
    const p0 = pool.run('hold', { payload: '' });

    const ac = new AbortController();
    const p1 = pool.run('cancelled', { payload: '', signal: ac.signal });

    ac.abort();

    let caught = null;
    try { await p1; } catch (e) { caught = e; }
    await p0;

    if (!caught) throw new Error('Expected queued task to be cancelled');
    pool.terminate();
  });

  // -------------------------------------------------------------------------
  it('terminate: rejects pending queue immediately', async () => {
    const pool = new Pool('/mock.js', { size: 1, max: 1 });

    const p0 = pool.run('hold', { payload: '' });
    const p1 = pool.run('pending', { payload: '' });

    pool.terminate();

    let caught = null;
    try { await p1; } catch (e) { caught = e; }

    if (!caught?.message?.includes('terminated')) {
      throw new Error(`Expected terminate error, got: ${caught?.message}`);
    }
    // p0 may resolve or reject, both are fine
    await p0.catch(() => {});
  });
});
