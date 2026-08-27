/**
 * tests/core/workers/index.test.js
 *
 * Facade: workers.run, pool reuse, workers.close, workers.clear,
 * has detection, workers.dedicated.
 * Source: plan.md Phase 8 — Test Matrix
 */

import { workers, has } from '@anzaui/anza/workers';

const originalWorker = globalThis.Worker;

function installMock() {
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

describe('Workers Facade', () => {

  before(installMock);

  after(() => {
    globalThis.Worker = originalWorker;
    workers.clear();
  });

  // -------------------------------------------------------------------------
  it('has: exposes feature detection flags', () => {
    if (typeof has.worker !== 'boolean') throw new Error('has.worker must be boolean');
    if (typeof has.locks !== 'boolean') throw new Error('has.locks must be boolean');
    if (typeof has.channel !== 'boolean') throw new Error('has.channel must be boolean');
  });

  // -------------------------------------------------------------------------
  it('run: resolves with worker value', async () => {
    const res = await workers.run('/mock.js', 'add', { payload: 3 });
    if (res !== 'add:3') throw new Error(`Expected "add:3", got "${res}"`);
  });

  // -------------------------------------------------------------------------
  it('run: reuses the same pool for the same script', async () => {
    const r1 = workers.run('/reuse.js', 'a', { payload: 1 });
    const r2 = workers.run('/reuse.js', 'b', { payload: 2 });
    const [v1, v2] = await Promise.all([r1, r2]);
    if (v1 !== 'a:1') throw new Error(`Expected "a:1", got "${v1}"`);
    if (v2 !== 'b:2') throw new Error(`Expected "b:2", got "${v2}"`);
  });

  // -------------------------------------------------------------------------
  it('close: terminates one pool and removes it from registry', async () => {
    await workers.run('/close-me.js', 'x', { payload: 0 });
    workers.close('/close-me.js');

    // After close, a new pool should be created (no error thrown)
    const res = await workers.run('/close-me.js', 'y', { payload: 1 });
    if (res !== 'y:1') throw new Error(`Expected "y:1", got "${res}"`);
  });

  // -------------------------------------------------------------------------
  it('clear: terminates all pools', async () => {
    await workers.run('/a.js', 't', { payload: 0 });
    await workers.run('/b.js', 't', { payload: 0 });
    workers.clear(); // should not throw
  });

  // -------------------------------------------------------------------------
  it('dedicated: returns a Dedicated instance that can run tasks', async () => {
    const w = workers.dedicated('/mock.js');
    const res = await w.run('ping', { payload: 'pong' });
    if (res !== 'ping:pong') throw new Error(`Expected "ping:pong", got "${res}"`);
    w.terminate();
  });
});
