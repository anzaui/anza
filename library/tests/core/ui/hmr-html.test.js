/**
 * tests/core/ui/hmr-html.test.js
 *
 * R8: an HTML hot-swap runs the cold-load pipeline (sanitizeTemplateHtml),
 * keeps the loaded tags descriptor and replaces the stale assetCache entry.
 */

import { element } from '../../../src/core/ui/index.js';
import { assetCache } from '../../../src/core/ui/define/state.js';

const wait = (ms = 0) => new Promise((r) => setTimeout(r, ms));

describe('HTML hot-swap (R8)', () => {
  it('sanitizes the new template, rebinds instances and refreshes the cache', async () => {
    const id = `${Date.now()}`;
    const tag = `x-hmr-html-${id}`;
    const dir = `/__hmr_${id}`;
    const templateUrl = `${location.origin}${dir}/index.html`;
    const original = globalThis.fetch;
    const originalLog = console.log;
    let fetches = 0;
    globalThis.fetch = async (input) => {
      fetches++;
      const url = String(typeof input === 'string' ? input : input.url);
      if (url.endsWith('.tags.json')) return new Response('{"refs":["title"]}');
      if (url.endsWith('.html')) return new Response('<h1 ref="title">v1</h1>');
      return new Response('', { status: 404 });
    };
    console.log = () => {};

    const el = document.createElement(tag);
    try {
      let mounts = 0;
      element(tag, { template: './index.html', mount: () => mounts++ }, `${location.origin}${dir}/index.js`);
      document.body.appendChild(el);
      for (let i = 0; i < 50 && mounts === 0; i++) await wait(5);
      if (el.shadowRoot.querySelector('h1')?.textContent !== 'v1') throw new Error('expected v1 render');
      const stale = assetCache.get(templateUrl);
      const fetchesBefore = fetches;

      // A full SSG document arrives: the swap must extract the host's DSD body.
      const html =
        `<!DOCTYPE html><html><body><${tag}><template shadowrootmode="open">` +
        `<style>.x{}</style><h1 ref="title">v2</h1></template></${tag}></body></html>`;
      window.dispatchEvent(new CustomEvent('anza:hmr:html', { detail: { path: `${dir}/index.html`, html } }));
      for (let i = 0; i < 50 && mounts < 2; i++) await wait(5);

      const h1 = el.shadowRoot.querySelector('h1');
      if (h1?.textContent !== 'v2') throw new Error('expected rebind to the swapped template');
      if (el.shadowRoot.querySelector('style')) throw new Error('expected sanitized template (no DSD <style>)');
      if (el.shadowRoot.querySelector('html, body')) throw new Error('expected no document shell in the template');
      if (el._refs.title !== h1) throw new Error('expected refs rebound to the new markup');

      const fresh = assetCache.get(templateUrl);
      if (!fresh || fresh === stale) throw new Error('expected the stale template evicted from assetCache');
      if (!fresh.querySelector('h1') || fresh.querySelector('h1').textContent !== 'v2') {
        throw new Error('expected the cache to hold the swapped template');
      }
      if (fetches !== fetchesBefore) throw new Error('hot-swap must not refetch styles or tags');
    } finally {
      el.remove();
      globalThis.fetch = original;
      console.log = originalLog;
    }
  });
});
