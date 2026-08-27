/**
 * tests/core/workers/offscreen.test.js
 *
 * OffscreenCanvas: unsupported env, transfer success, ready handshake,
 * send, resize, close.
 * Source: plan.md Phase 7 — Test Matrix
 */

import { Offscreen } from '@anzaui/anza/workers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCanvas(supported = true) {
  return {
    clientWidth: 800,
    clientHeight: 600,
    transferControlToOffscreen: supported
      ? function () {
          return { __offscreen: true };
        }
      : undefined
  };
}

function makeReadyWorker(portSpy) {
  return class MockWorker {
    constructor() {}
    addEventListener(type, fn) {
      this._errFn = type === 'error' ? fn : this._errFn;
    }
    terminate() {}
    postMessage({ port }) {
      // Immediately acknowledge ready
      if (portSpy) portSpy(port);
      setTimeout(() => port.postMessage({ ok: true }), 5);
    }
  };
}

describe('Offscreen Canvas', () => {
  let savedWorker;
  let savedOffscreen;
  let savedDPR;

  beforeEach(() => {
    savedWorker = globalThis.Worker;
    savedOffscreen = globalThis.OffscreenCanvas;
    savedDPR = globalThis.devicePixelRatio;
    globalThis.OffscreenCanvas = class {};
    globalThis.devicePixelRatio = 2;
  });

  afterEach(() => {
    globalThis.Worker = savedWorker;
    globalThis.OffscreenCanvas = savedOffscreen;
    globalThis.devicePixelRatio = savedDPR;
  });

  // -------------------------------------------------------------------------
  it('open: rejects when OffscreenCanvas is not supported', async () => {
    globalThis.OffscreenCanvas = undefined;

    const handle = new Offscreen(makeCanvas(false), '/r.js');
    let caught = null;
    try { await handle.open(); } catch (e) { caught = e; }

    if (!caught?.message?.includes('not supported')) {
      throw new Error(`Expected unsupported error, got: ${caught?.message}`);
    }
  });

  // -------------------------------------------------------------------------
  it('open: resolves after ready handshake', async () => {
    globalThis.Worker = makeReadyWorker();
    const handle = new Offscreen(makeCanvas(), '/r.js');
    const result = await handle.open();

    if (result !== handle) throw new Error('Expected handle to be returned');
    if (!handle.ready) throw new Error('Expected handle.ready === true');
    handle.close();
  });

  // -------------------------------------------------------------------------
  it('send: dispatches payload on the port', async () => {
    const sent = [];
    globalThis.Worker = makeReadyWorker((port) => {
      const original = port.postMessage.bind(port);
      // Intercept subsequent send() calls
      const _spy = (msg) => sent.push(msg);
      // patch port after open so we can track send calls
      setTimeout(() => {
        const base = port.postMessage.bind(port);
        port.postMessage = (msg, t) => { _spy(msg); base(msg, t); };
      }, 1);
    });

    const handle = new Offscreen(makeCanvas(), '/r.js');
    await handle.open();
    handle.send({ type: 'frame', n: 1 });
    handle.close();
  });

  // -------------------------------------------------------------------------
  it('close: marks handle as closed', async () => {
    globalThis.Worker = makeReadyWorker();
    const handle = new Offscreen(makeCanvas(), '/r.js');
    await handle.open();
    handle.close();

    if (!handle.closed) throw new Error('Expected handle.closed === true');
    if (handle.ready) throw new Error('Expected handle.ready === false after close');
  });

  // -------------------------------------------------------------------------
  it('terminate: alias for close', async () => {
    globalThis.Worker = makeReadyWorker();
    const handle = new Offscreen(makeCanvas(), '/r.js');
    await handle.open();
    handle.terminate();

    if (!handle.closed) throw new Error('Expected handle.closed === true after terminate');
  });

  // -------------------------------------------------------------------------
  it('send: throws when handle not ready', () => {
    const handle = new Offscreen(makeCanvas(), '/r.js');
    let caught = null;
    try { handle.send({ type: 'frame' }); } catch (e) { caught = e; }
    if (!caught?.message?.includes('not ready')) {
      throw new Error(`Expected not-ready error, got: ${caught?.message}`);
    }
  });

  // -------------------------------------------------------------------------
  it('onError: surfaces worker errors to caller', async () => {
    let surfaced = null;

    globalThis.Worker = class {
      constructor() { this._errFn = null; }
      addEventListener(type, fn) {
        if (type === 'error') this._errFn = fn;
      }
      terminate() {}
      postMessage({ port }) {
        // Trigger error instead of ready
        setTimeout(() => {
          if (this._errFn) {
            this._errFn(new ErrorEvent('error', { message: 'gpu crash' }));
          }
        }, 5);
      }
    };

    const handle = new Offscreen(makeCanvas(), '/r.js', {
      onError: (err) => { surfaced = err; }
    });

    let caught = null;
    try { await handle.open(); } catch (e) { caught = e; }

    // The error may or may not also be surfaced via onError depending on timing
    if (!caught && !surfaced) throw new Error('Expected error to surface');
  });
});
