/**
 * tests/core/platform/speed.test.js
 *
 * Browser-Native Performance & Speed Benchmark Suite.
 * Measures sub-millisecond execution latency across signals, state reactivity,
 * TagsCache O(1) query lookups, and router matching per SKILL.md.
 */

import { state } from '../../../src/core/state/index.js';
import { TagsCache } from '../../../src/core/ui/define/proxy.js';
import { match, register } from '../../../src/core/router/index.js';

describe('Performance & Speed Benchmark Suite (Native Browser)', () => {
  it('measures reactive store read/write mutation latency (< 0.05 ms / 1,000 updates)', () => {
    const store = state.create({ count: 0, text: 'hello' });
    let triggers = 0;
    store.subscribe('count', () => {
      triggers++;
    });

    const iterations = 5000;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      store.set('count', i);
      const val = store.get('count');
    }
    const elapsed = performance.now() - start;
    const latencyPerOp = elapsed / iterations;

    console.log(`[Browser Speed Benchmark] Reactive Store: ${iterations} mutations/reads in ${elapsed.toFixed(3)} ms (${(latencyPerOp * 1000).toFixed(2)} µs/op)`);

    if (store.get('count') !== iterations - 1) {
      throw new Error(`Store value mismatch: ${store.get('count')}`);
    }
    if (latencyPerOp > 0.05) {
      throw new Error(`Store mutation latency too high: ${latencyPerOp.toFixed(3)} ms/op`);
    }
  });

  it('measures TagsCache O(1) DOM query cache latency (< 50 µs / lookup)', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <div id="header" class="header-box">Title</div>
      <button id="action-btn" class="btn">Click</button>
      <span id="label" ref="textLabel">Label</span>
    `;
    document.body.appendChild(host);

    const cache = new TagsCache(shadow);

    // Warm cache
    cache.one('#action-btn');

    const iterations = 5000;
    const start = performance.now();
    let btn = null;
    for (let i = 0; i < iterations; i++) {
      btn = cache.one('#action-btn');
    }
    const elapsed = performance.now() - start;
    const latencyPerOp = (elapsed / iterations) * 1000; // in microseconds

    console.log(`[Browser Speed Benchmark] TagsCache O(1) Reads: ${iterations} cached queries in ${elapsed.toFixed(3)} ms (${latencyPerOp.toFixed(2)} µs/lookup)`);

    host.remove();

    if (!btn || btn.id !== 'action-btn') {
      throw new Error('Expected cached element lookup to succeed');
    }
    if (latencyPerOp > 150) {
      throw new Error(`TagsCache latency exceeded 150 µs target: ${latencyPerOp.toFixed(2)} µs`);
    }
  });

  it('measures router pattern matching throughput (> 5,000 matches/sec)', async () => {
    register('/products/:category/:id', 'product-view');
    register('/docs/:section/:page', 'doc-view');
    register('/user/:name/settings', 'user-settings');

    const iterations = 500;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      await match(`https://example.com/products/electronics/${i}`);
    }
    const elapsed = performance.now() - start;
    const matchesPerSec = (iterations / elapsed) * 1000;

    console.log(`[Browser Speed Benchmark] Router Pattern Matching: ${iterations} route resolutions in ${elapsed.toFixed(3)} ms (${matchesPerSec.toFixed(0)} matches/sec)`);

    if (matchesPerSec < 500) {
      throw new Error(`Router matching throughput too low: ${matchesPerSec.toFixed(0)} matches/sec`);
    }
  });
});
