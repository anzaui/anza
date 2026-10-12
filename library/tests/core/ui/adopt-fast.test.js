/**
 * tests/core/ui/adopt-fast.test.js
 *
 * P3: a pre-rendered (DSD) shadow root is wired (refs / on / mount) before the
 * element's style/template resources are fetched. Resources load afterwards
 * for stylesheets and the one-shot mismatch check.
 */

import { element } from '../../../src/core/ui/index.js';
import { whenLive, add, remove } from '../../../src/core/router/graph.js';

let seq = 0;

function gatedFetch(bodies) {
  const original = globalThis.fetch;
  let release;
  const gate = new Promise((r) => (release = r));
  let calls = 0;
  globalThis.fetch = async (input) => {
    calls++;
    await gate;
    const name = String(typeof input === 'string' ? input : input.url).split('/').pop();
    const body = bodies[name];
    return body == null ? new Response('', { status: 404 }) : new Response(body);
  };
  return {
    release: () => release(),
    get calls() {
      return calls;
    },
    restore: () => (globalThis.fetch = original)
  };
}

function dsdHost(tag, markup) {
  const el = document.createElement(tag);
  el.attachShadow({ mode: 'open' }).innerHTML = markup;
  return el;
}

const wait = (ms = 0) => new Promise((r) => setTimeout(r, ms));

describe('DSD adoption fast path (P3)', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('mounts adopted markup before resources resolve, then adopts styles', async () => {
    const id = `${Date.now()}-${seq++}`;
    const tag = `x-adopt-fast-${id}`;
    const stub = gatedFetch({ 'style.css': ':host{color:red}', 'index.html': '<p ref="msg">csr</p>' });
    try {
      const mounts = [];
      const el = dsdHost(tag, '<p ref="msg">ssr</p>');
      container.appendChild(el);
      element(tag, {
        style: './style.css',
        template: './index.html',
        mount(ctx) {
          mounts.push(ctx.refs.msg?.textContent);
        }
      }, `${location.origin}/__adopt_${id}/index.js`);

      await wait();
      if (mounts.length !== 1 || mounts[0] !== 'ssr') {
        throw new Error(`expected mount with DSD refs before fetch resolved, got ${JSON.stringify(mounts)}`);
      }
      if (el.shadowRoot.adoptedStyleSheets.length !== 0) throw new Error('styles not loaded yet');

      stub.release();
      await wait(10);
      if (el.shadowRoot.adoptedStyleSheets.length !== 1) throw new Error('expected stylesheet adopted after load');
      if (mounts.length !== 1) throw new Error('matching DSD must not remount');
      if (el.shadowRoot.querySelector('[ref="msg"]').textContent !== 'ssr') throw new Error('DSD must be kept');
    } finally {
      stub.restore();
    }
  });

  it('re-renders once on a late mismatch and drops the first wiring', async () => {
    const id = `${Date.now()}-${seq++}`;
    const tag = `x-adopt-mismatch-${id}`;
    const stub = gatedFetch({ 'index.html': '<button ref="action">client</button>' });
    try {
      let mounts = 0;
      let unmounts = 0;
      let clicks = 0;
      const el = dsdHost(tag, '<button id="stale">server</button>');
      container.appendChild(el);
      element(tag, {
        template: './index.html',
        mount({ on }) {
          mounts++;
          on.click('button', () => clicks++);
        },
        unmount() {
          unmounts++;
        }
      }, `${location.origin}/__adopt_${id}/index.js`);

      await wait();
      if (mounts !== 1) throw new Error('expected immediate mount on adopted DSD');

      stub.release();
      await wait(10);
      if (el.shadowRoot.querySelector('#stale')) throw new Error('expected mismatched DSD replaced');
      if (!el.shadowRoot.querySelector('[ref="action"]')) throw new Error('expected client template');
      if (mounts !== 2 || unmounts !== 1) throw new Error(`expected one remount, got ${mounts}/${unmounts}`);
      if (el._refs.action !== el.shadowRoot.querySelector('[ref="action"]')) throw new Error('expected refs re-wired');

      el.shadowRoot.querySelector('button').click();
      if (clicks !== 1) throw new Error(`expected listeners from the first wiring removed, got ${clicks} clicks`);
    } finally {
      stub.restore();
    }
  });
});

describe('graph.whenLive', () => {
  it('resolves when a container registers and immediately when already live', async () => {
    const name = `when-live-${seq++}`;
    const el = document.createElement('div');
    let done = false;
    const pending = whenLive(name).then(() => (done = true));
    add(name, null);
    await wait();
    if (done) throw new Error('a null registration must not resolve whenLive');
    add(name, el);
    await pending;
    await whenLive(name);
    remove(name, el);
  });
});
