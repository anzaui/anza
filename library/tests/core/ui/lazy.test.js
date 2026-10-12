/**
 * tests/core/ui/lazy.test.js
 *
 * P1: elements with URL resources fetch them on first connect, not at
 * define time. `eager: true` restores define-time fetching.
 */

import { element, view } from '../../../src/core/ui/index.js';

let seq = 0;

function countingFetch() {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input) => {
    const url = typeof input === 'string' ? input : input.url;
    calls.push(url);
    if (url.endsWith('.css')) return new Response(':host{display:block}');
    if (url.endsWith('.html')) return new Response('<p ref="msg">hi</p>');
    return new Response('', { status: 404 });
  };
  return { calls, restore: () => (globalThis.fetch = original) };
}

function names() {
  const id = `${Date.now()}-${seq++}`;
  return { tag: `x-lazy-${id}`, base: `${location.origin}/__lazy_${id}/index.js` };
}

const waitFor = async (check) => {
  for (let i = 0; i < 100 && !check(); i++) await new Promise((r) => setTimeout(r, 5));
};

describe('element resource loading (P1)', () => {
  it('does not fetch at define time; fetches on first connect', async () => {
    const stub = countingFetch();
    const { tag, base } = names();
    try {
      let mounted = false;
      element(tag, {
        style: './style.css',
        template: './index.html',
        mount() {
          mounted = true;
        }
      }, base);
      await new Promise((r) => setTimeout(r, 10));
      if (stub.calls.length !== 0) throw new Error(`expected no fetch at define, got ${stub.calls}`);

      const el = document.createElement(tag);
      document.body.appendChild(el);
      await waitFor(() => mounted);
      el.remove();
      if (!mounted) throw new Error('expected mount after connect');
      if (stub.calls.length !== 3) throw new Error(`expected style+template+tags on connect, got ${stub.calls.length}`);
      if (!el.shadowRoot.querySelector('[ref="msg"]')) throw new Error('expected template rendered');
    } finally {
      stub.restore();
    }
  });

  it('eager: true fetches at define time', async () => {
    const stub = countingFetch();
    const { tag, base } = names();
    try {
      element(tag, { style: './style.css', template: './index.html', eager: true }, base);
      await new Promise((r) => setTimeout(r, 0));
      if (stub.calls.length !== 3) throw new Error(`expected define-time fetch, got ${stub.calls.length}`);
    } finally {
      stub.restore();
    }
  });

  it('view() passes eager through and stays lazy by default', async () => {
    const stub = countingFetch();
    const lazy = names();
    const eager = names();
    try {
      view(lazy.tag, { template: './index.html' }, lazy.base);
      await new Promise((r) => setTimeout(r, 0));
      if (stub.calls.length !== 0) throw new Error('expected lazy view to not fetch');
      view(eager.tag, { template: './index.html', eager: true }, eager.base);
      await new Promise((r) => setTimeout(r, 0));
      if (stub.calls.length !== 2) throw new Error(`expected eager view to fetch, got ${stub.calls.length}`);
    } finally {
      stub.restore();
    }
  });
});
