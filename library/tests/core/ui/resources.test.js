/**
 * tests/core/ui/resources.test.js
 *
 * P2 / S1: style, template and tags descriptor are fetched in parallel, and
 * concurrent loads of the same URL share one fetch and one CSSStyleSheet.
 */

import { preloadResources, evictAsset } from '../../../src/core/ui/define/utils.js';

let seq = 0;
const unique = (name) => `${location.origin}/__res_${Date.now()}_${seq++}/${name}`;

function stubFetch(bodies) {
  const original = globalThis.fetch;
  const calls = [];
  const releases = [];
  globalThis.fetch = (input) => {
    const url = typeof input === 'string' ? input : input.url;
    calls.push(url);
    return new Promise((resolve) => {
      releases.push(() => {
        const body = bodies[url.split('/').pop()];
        resolve(body == null ? new Response('', { status: 404 }) : new Response(body));
      });
    });
  };
  return {
    calls,
    releaseAll() {
      while (releases.length) releases.shift()();
    },
    restore() {
      globalThis.fetch = original;
    }
  };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('preloadResources', () => {
  it('starts style, template and tags fetches together', async () => {
    const css = unique('a.css');
    const html = unique('a.html');
    const stub = stubFetch({
      'a.css': ':host{color:red}',
      'a.html': '<p ref="x">hi</p>',
      'a.tags.json': '{"refs":["x"]}'
    });
    try {
      const pending = preloadResources('x-par', [css], html, null, null);
      await tick();
      // All three requests are in flight before any of them has resolved.
      if (stub.calls.length !== 3) {
        throw new Error(`expected 3 parallel fetches, got ${stub.calls.length}: ${stub.calls}`);
      }
      stub.releaseAll();
      const res = await pending;
      if (res.stylesheets.length !== 1 && !res.cssText) throw new Error('expected style');
      if (!res.templateNode?.querySelector('[ref="x"]')) throw new Error('expected template');
      if (res.tagsDescriptor?.refs?.[0] !== 'x') throw new Error('expected tags descriptor');
    } finally {
      stub.restore();
    }
  });

  it('shares one in-flight fetch and one stylesheet between concurrent callers', async () => {
    const css = unique('b.css');
    const html = unique('b.html');
    const stub = stubFetch({ 'b.css': ':host{color:blue}', 'b.html': '<p>b</p>' });
    try {
      const first = preloadResources('x-share-1', [css], html, null, null);
      const second = preloadResources('x-share-2', [css], html, null, null);
      await tick();
      if (stub.calls.length !== 3) {
        throw new Error(`expected 3 fetches for 2 concurrent callers, got ${stub.calls.length}`);
      }
      stub.releaseAll();
      const [a, b] = await Promise.all([first, second]);
      if (a.stylesheets[0] !== b.stylesheets[0]) throw new Error('expected one shared CSSStyleSheet');
      if (a.templateNode !== b.templateNode) throw new Error('expected one shared template fragment');

      // Settled: a third caller hits the cache, no new fetches (404 tags cached too).
      await preloadResources('x-share-3', [css], html, null, null);
      if (stub.calls.length !== 3) throw new Error('expected cached resources to skip fetch');
    } finally {
      stub.restore();
    }
  });

  it('keeps stylesheet declaration order regardless of finish order', async () => {
    const first = unique('first.css');
    const second = unique('second.css');
    const original = globalThis.fetch;
    globalThis.fetch = async (url) => {
      if (String(url).endsWith('first.css')) await new Promise((r) => setTimeout(r, 20));
      return new Response(String(url).endsWith('first.css') ? '.first{}' : '.second{}');
    };
    try {
      const res = await preloadResources('x-order', [first, second], null, null, null);
      const texts = res.stylesheets.map((s) => s.cssRules[0].selectorText);
      if (texts.join(',') !== '.first,.second') throw new Error(`unexpected order ${texts}`);
    } finally {
      globalThis.fetch = original;
    }
  });

  it('retries after a failed load and refetches after evictAsset', async () => {
    const css = unique('c.css');
    const original = globalThis.fetch;
    const originalError = console.error;
    console.error = () => {};
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      return calls === 1 ? new Response('', { status: 500 }) : new Response('.c{}');
    };
    try {
      const failed = await preloadResources('x-retry', [css], null, null, null);
      if (failed.stylesheets.length !== 0) throw new Error('expected no sheet on failure');
      const ok = await preloadResources('x-retry', [css], null, null, null);
      if (ok.stylesheets.length !== 1) throw new Error('expected retry to load the sheet');
      evictAsset(css);
      await preloadResources('x-retry', [css], null, null, null);
      if (calls !== 3) throw new Error(`expected refetch after eviction, got ${calls} calls`);
    } finally {
      globalThis.fetch = original;
      console.error = originalError;
    }
  });
});
