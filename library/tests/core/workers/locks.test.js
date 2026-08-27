/**
 * tests/core/workers/locks.test.js
 *
 * Web Locks: exclusive, shared, timeout, abort, ifAvailable, fallback ordering.
 * Source: plan.md Phase 6 — Test Matrix
 */

import { lock } from '@anzaui/anza/workers';

describe('Web Locks Synchronization', () => {

  // -------------------------------------------------------------------------
  it('acquire: executes callback and returns value', async () => {
    let executed = false;
    const res = await lock('test:basic', async () => {
      executed = true;
      return 'ok';
    });

    if (!executed) throw new Error('Callback did not execute');
    if (res !== 'ok') throw new Error(`Expected "ok", got "${res}"`);
  });

  // -------------------------------------------------------------------------
  it('exclusive: serialises concurrent holders', async () => {
    const active = [];
    const order = [];

    const hold = async (id, delay) =>
      lock('test:serial', async () => {
        active.push(id);
        if (active.length > 1) throw new Error(`Concurrent violation! Active: ${JSON.stringify(active)}`);
        await new Promise((r) => setTimeout(r, delay));
        order.push(id);
        active.pop();
      });

    await Promise.all([hold('A', 20), hold('B', 5)]);

    if (order[0] !== 'A' || order[1] !== 'B') {
      throw new Error(`Expected [A, B], got ${JSON.stringify(order)}`);
    }
  });

  // -------------------------------------------------------------------------
  it('timeout: rejects when acquisition exceeds threshold', async () => {
    const ac = new AbortController();
    let resolveHeld;
    const held = new Promise((r) => { resolveHeld = r; });

    // Acquire and hold indefinitely
    const pHold = lock('test:to', async () => {
      resolveHeld();
      await new Promise((r) => ac.signal.addEventListener('abort', r, { once: true }));
    });

    await held;

    let caught = null;
    try {
      await lock('test:to', async () => {}, { timeout: 80 });
    } catch (e) {
      caught = e;
    } finally {
      ac.abort();
      await pHold;
    }

    if (!caught?.message?.includes('timed out') && caught?.name !== 'TimeoutError') {
      throw new Error(`Expected timeout error, got: ${caught?.message}`);
    }
  });

  // -------------------------------------------------------------------------
  it('signal: aborts lock acquisition from caller', async () => {
    const ac = new AbortController();
    let resolveHeld;
    const held = new Promise((r) => { resolveHeld = r; });

    const releaseAc = new AbortController();
    const pHold = lock('test:sig', async () => {
      resolveHeld();
      await new Promise((r) => releaseAc.signal.addEventListener('abort', r, { once: true }));
    });

    await held;

    const pWait = lock('test:sig', async () => {}, { signal: ac.signal });
    setTimeout(() => ac.abort(), 30);

    let caught = null;
    try { await pWait; } catch (e) { caught = e; }
    finally { releaseAc.abort(); await pHold; }

    if (!caught) throw new Error('Expected rejection from abort');
  });

  // -------------------------------------------------------------------------
  it('ifAvailable: rejects immediately when lock is held', async () => {
    const releaseAc = new AbortController();
    let resolveHeld;
    const held = new Promise((r) => { resolveHeld = r; });

    const pHold = lock('test:if', async () => {
      resolveHeld();
      await new Promise((r) => releaseAc.signal.addEventListener('abort', r, { once: true }));
    });

    await held;

    let caught = null;
    try {
      await lock('test:if', async () => {}, { ifAvailable: true });
    } catch (e) {
      caught = e;
    } finally {
      releaseAc.abort();
      await pHold;
    }

    if (!caught) throw new Error('Expected immediate rejection for ifAvailable');
  });
});
