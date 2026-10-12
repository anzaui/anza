/**
 * tests/core/ui/adopt-built-page.test.js
 *
 * A built SSG page module registers its tags descriptor (not its HTML) in
 * the inline registry, so an adopted page root still runs the hydration
 * mismatch check without a request: a matching DSD costs zero fetches, a
 * DSD that lacks a descriptor ref re-renders once from the fetched
 * template. The fixtures are byte-identical to `anza build` output
 * (tools/tests/page_tags.rs).
 */

const waitFor = async (check) => {
  for (let i = 0; i < 100 && !check(); i++) await new Promise((r) => setTimeout(r, 5));
};
const wait = (ms = 0) => new Promise((r) => setTimeout(r, ms));

function countingFetch() {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input) => {
    const url = typeof input === 'string' ? input : input.url;
    calls.push(url);
    if (url.endsWith('template.html')) return new Response('<p ref="msg">client</p><button ref="action">go</button>');
    return new Response('', { status: 404 });
  };
  return { calls, restore: () => (globalThis.fetch = original) };
}

function dsdHost(tag, markup) {
  const el = document.createElement(tag);
  el.attachShadow({ mode: 'open' }).innerHTML = markup;
  return el;
}

describe('built SSG page module: inlined tags descriptor', () => {
  let container;
  let stub;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    stub = countingFetch();
  });

  afterEach(() => {
    stub.restore();
    container.remove();
  });

  it('hydrates a matching DSD with zero fetches', async () => {
    const el = dsdHost('x-built-page-match', '<p ref="msg">server</p><button ref="action">go</button>');
    container.appendChild(el);
    const { mounts } = await import('./fixtures/built-page/match/index.js');

    await waitFor(() => mounts.length > 0 && el.shadowRoot.adoptedStyleSheets.length > 0);
    await wait(20);
    if (stub.calls.length !== 0) throw new Error(`expected no fetches, got ${JSON.stringify(stub.calls)}`);
    if (mounts.length !== 1 || mounts[0] !== 'server') {
      throw new Error(`expected one mount on the DSD, got ${JSON.stringify(mounts)}`);
    }
  });

  it('re-renders once when the DSD lacks a descriptor ref', async () => {
    const el = dsdHost('x-built-page-stale', '<p ref="msg">stale</p>');
    container.appendChild(el);
    const { mounts } = await import('./fixtures/built-page/stale/index.js');

    await waitFor(() => mounts.length === 2);
    if (mounts[0] !== 'stale' || mounts[1] !== 'client') {
      throw new Error(`expected DSD mount then one remount, got ${JSON.stringify(mounts)}`);
    }
    if (!el.shadowRoot.querySelector('[ref="action"]')) throw new Error('expected the client template');
    // Only the template is fetched: the descriptor and the CSS are inlined.
    const names = stub.calls.map((u) => u.split('/').pop());
    if (names.join() !== 'template.html') throw new Error(`expected only the template fetched, got ${names}`);
    await wait(20);
    if (mounts.length !== 2) throw new Error('expected a single re-render');
  });
});
