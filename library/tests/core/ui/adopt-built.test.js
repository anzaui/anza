/**
 * tests/core/ui/adopt-built.test.js
 *
 * P13: in a built app (build-time inline registry present) a pre-rendered
 * (DSD) page root hydrates from what the server already rendered: no fetch
 * of its template, tags descriptor or the stylesheets its DSD links. A soft
 * navigation (CSR instance) still fetches and renders, and a mismatch found
 * through an inlined tags descriptor still re-renders from the template.
 */

import { page } from '../../../src/core/ui/index.js';

let seq = 0;

function countingFetch() {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input) => {
    const url = typeof input === 'string' ? input : input.url;
    calls.push(url);
    if (url.includes('.css')) return new Response('p{color:rgb(4, 5, 6)}');
    if (url.endsWith('template.html')) return new Response('<p ref="msg">client</p><button ref="action">go</button>');
    if (url.endsWith('template.tags.json')) {
      return new Response(JSON.stringify({ version: 1, refs: ['msg', 'action'], tags: ['p', 'button'] }));
    }
    return new Response('', { status: 404 });
  };
  return { calls, restore: () => (globalThis.fetch = original) };
}

/** A page definition shaped like a built SSG docs page. */
function definePage(extra = {}) {
  const id = `${Date.now()}-${seq++}`;
  const dir = `${location.origin}/__p13_${id}`;
  const tag = `x-p13-page-${id}`;
  // A real file (no 404 from the DSD <link>); the query keeps the URL unique.
  const shared = `/src/styles/layers.css?p13=${id}`;
  const base = `${dir}/index.js`;
  const mounts = [];
  // The prelude `anza build` puts in a page module: its own CSS only.
  const registry = (globalThis.__anzaInline ??= new Map());
  registry.set(new URL('./index.css', base).href, ':host{display:block}');
  for (const [rel, value] of Object.entries(extra)) registry.set(new URL(rel, base).href, value);
  const define = () =>
    page(`/__p13/${id}`, {
      tag,
      template: { html: './template.html' },
      style: ['./index.css', shared],
      on: {
        connect({ refs }) {
          mounts.push(refs.msg?.textContent ?? null);
        }
      }
    }, base);
  return { tag, shared, dir, mounts, define };
}

function dsdHost(tag, markup) {
  const el = document.createElement(tag);
  el.attachShadow({ mode: 'open' }).innerHTML = markup;
  return el;
}

const waitFor = async (check) => {
  for (let i = 0; i < 100 && !check(); i++) await new Promise((r) => setTimeout(r, 5));
};
const wait = (ms = 0) => new Promise((r) => setTimeout(r, ms));

describe('built app: adopted page roots (P13)', () => {
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

  it('hydrates an adopted page with zero template/tags/css fetches', async () => {
    const p = definePage();
    const el = dsdHost(p.tag, `<link rel="stylesheet" href="${p.shared}"><p ref="msg">server</p>`);
    container.appendChild(el);
    p.define();

    await waitFor(() => p.mounts.length > 0 && el.shadowRoot.adoptedStyleSheets.length > 0);
    await wait(20);
    if (stub.calls.length !== 0) throw new Error(`expected no fetches, got ${JSON.stringify(stub.calls)}`);
    if (p.mounts.length !== 1 || p.mounts[0] !== 'server') {
      throw new Error(`expected one mount on the DSD, got ${JSON.stringify(p.mounts)}`);
    }
    // Only the inlined page CSS is adopted; the linked shared CSS stays a <link>.
    if (el.shadowRoot.adoptedStyleSheets.length !== 1) throw new Error('expected the inlined page sheet adopted');
    if (el.shadowRoot.querySelector('[ref="msg"]').textContent !== 'server') throw new Error('DSD must be kept');
  });

  it('still fetches unlinked, non-inlined styles for an adopted root', async () => {
    const p = definePage();
    const el = dsdHost(p.tag, '<p ref="msg">server</p>');
    container.appendChild(el);
    p.define();

    await waitFor(() => el.shadowRoot.adoptedStyleSheets.length === 2);
    const names = stub.calls.map((u) => u.split('/').pop().split('?')[0]);
    if (names.join() !== 'layers.css') throw new Error(`expected only the shared CSS fetch, got ${names}`);
  });

  it('soft navigation to the page still fetches and renders it', async () => {
    const p = definePage();
    const adopted = dsdHost(p.tag, `<link rel="stylesheet" href="${p.shared}"><p ref="msg">server</p>`);
    container.appendChild(adopted);
    p.define();
    await waitFor(() => p.mounts.length === 1);
    if (stub.calls.length !== 0) throw new Error('adopted hydration must not fetch');

    // A CSR instance, as the router creates on a soft navigation.
    const fresh = document.createElement(p.tag);
    container.appendChild(fresh);
    await waitFor(() => p.mounts.length === 2);

    const names = stub.calls.map((u) => u.split('/').pop().split('?')[0]).sort();
    if (names.join() !== 'layers.css,template.html,template.tags.json') {
      throw new Error(`expected template, tags and shared CSS fetched, got ${names}`);
    }
    if (fresh.shadowRoot.querySelector('[ref="msg"]')?.textContent !== 'client') throw new Error('expected CSR render');
    if (fresh.shadowRoot.adoptedStyleSheets.length !== 2) throw new Error('expected page + shared sheets');
  });

  it('re-renders once when the inlined tags descriptor shows a mismatch', async () => {
    const p = definePage({ './template.tags.json': { version: 1, refs: ['msg', 'action'] } });
    const el = dsdHost(p.tag, `<link rel="stylesheet" href="${p.shared}"><p ref="msg">stale</p>`);
    container.appendChild(el);
    p.define();

    await waitFor(() => p.mounts.length === 2);
    if (p.mounts[0] !== 'stale' || p.mounts[1] !== 'client') {
      throw new Error(`expected DSD mount then one remount, got ${JSON.stringify(p.mounts)}`);
    }
    if (!el.shadowRoot.querySelector('[ref="action"]')) throw new Error('expected client template');
    if (el.shadowRoot.querySelector('link')) throw new Error('expected the DSD replaced');
    // The re-render dropped the DSD <link>, so every style is adopted.
    if (el.shadowRoot.adoptedStyleSheets.length !== 2) throw new Error('expected page + shared sheets adopted');
    const names = stub.calls.map((u) => u.split('/').pop().split('?')[0]);
    if (!names.includes('template.html')) throw new Error(`expected the template fetched, got ${names}`);
    await wait(20);
    if (p.mounts.length !== 2) throw new Error('expected a single re-render');
  });

  it('fills an empty adopted root from the fetched template', async () => {
    const p = definePage();
    const el = dsdHost(p.tag, `<link rel="stylesheet" href="${p.shared}">`);
    container.appendChild(el);
    p.define();

    await waitFor(() => p.mounts.length === 1);
    if (p.mounts[0] !== 'client') throw new Error(`expected client render, got ${JSON.stringify(p.mounts)}`);
    if (!stub.calls.some((u) => u.endsWith('template.html'))) throw new Error('expected the template fetched');
  });
});
