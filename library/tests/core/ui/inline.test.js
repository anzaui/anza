/**
 * tests/core/ui/inline.test.js
 *
 * P1/P4: `anza build` registers element CSS, HTML and tags descriptors in
 * `globalThis.__anzaInline` (keyed by resolved URL). The runtime uses them
 * instead of fetching, and builds one CSSStyleSheet per element type.
 */

import { element } from '../../../src/core/ui/index.js';

let seq = 0;

function countingFetch() {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input) => {
    const url = typeof input === 'string' ? input : input.url;
    calls.push(url);
    if (url.endsWith('.css')) return new Response(':host{display:inline}');
    if (url.endsWith('.html')) return new Response('<p ref="fetched">fetched</p>');
    return new Response('', { status: 404 });
  };
  return { calls, restore: () => (globalThis.fetch = original) };
}

function names() {
  const id = `${Date.now()}-${seq++}`;
  return { tag: `x-inline-${id}`, base: `${location.origin}/__inline_${id}/index.js` };
}

/** Same shape as the registration `anza build` prepends to a module. */
function register(base, entries) {
  const map = (globalThis.__anzaInline ??= new Map());
  for (const [rel, value] of Object.entries(entries)) map.set(new URL(rel, base).href, value);
}

const waitFor = async (check) => {
  for (let i = 0; i < 100 && !check(); i++) await new Promise((r) => setTimeout(r, 5));
};

describe('build-time inlined element resources', () => {
  it('uses inlined CSS, HTML and tags without fetching', async () => {
    const stub = countingFetch();
    const { tag, base } = names();
    register(base, {
      './style.css': ':host{display:block;color:rgb(1, 2, 3)}',
      './index.html': '<p ref="msg">inline</p>',
      './index.tags.json': { version: 1, refs: ['msg'], tags: ['p'] }
    });
    try {
      let mounted = false;
      element(tag, {
        style: './style.css',
        template: './index.html',
        mount() {
          mounted = true;
        }
      }, base);
      const el = document.createElement(tag);
      document.body.appendChild(el);
      await waitFor(() => mounted);
      if (!mounted) throw new Error('expected mount');
      if (stub.calls.length !== 0) throw new Error(`expected no fetch, got ${stub.calls}`);
      if (!el.shadowRoot.querySelector('[ref="msg"]')) throw new Error('expected inlined template');
      if (getComputedStyle(el).display !== 'block') throw new Error('expected inlined style applied');
      el.remove();
    } finally {
      stub.restore();
    }
  });

  it('adopts one CSSStyleSheet per element type across instances', async () => {
    const stub = countingFetch();
    const { tag, base } = names();
    register(base, {
      './style.css': ':host{display:block}',
      './index.html': '<span>x</span>',
      './index.tags.json': null // the build registers a missing descriptor as null
    });
    try {
      let mounts = 0;
      element(tag, { style: './style.css', template: './index.html', mount() { mounts++; } }, base);
      const a = document.createElement(tag);
      const b = document.createElement(tag);
      document.body.append(a, b);
      await waitFor(() => mounts === 2);
      if (mounts !== 2) throw new Error('expected both mounted');
      const [sa] = a.shadowRoot.adoptedStyleSheets;
      const [sb] = b.shadowRoot.adoptedStyleSheets;
      if (!sa || sa !== sb) throw new Error('expected the same adopted sheet');
      if (stub.calls.length !== 0) throw new Error(`expected no fetch, got ${stub.calls}`);
      a.remove();
      b.remove();
    } finally {
      stub.restore();
    }
  });

  it('fetches what is not inlined (dev and unbuilt apps)', async () => {
    const stub = countingFetch();
    const { tag, base } = names();
    register(base, { './style.css': ':host{display:block}' });
    try {
      let mounted = false;
      element(tag, { style: './style.css', template: './index.html', mount() { mounted = true; } }, base);
      const el = document.createElement(tag);
      document.body.appendChild(el);
      await waitFor(() => mounted);
      if (!el.shadowRoot.querySelector('[ref="fetched"]')) throw new Error('expected fetched template');
      const fetched = stub.calls.map((u) => u.split('/').pop()).sort().join(',');
      if (fetched !== 'index.html,index.tags.json') throw new Error(`unexpected fetches: ${fetched}`);
      el.remove();
    } finally {
      stub.restore();
    }
  });
});
