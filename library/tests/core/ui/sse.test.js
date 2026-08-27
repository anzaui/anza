/**
 * tests/core/ui/sse.test.js
 *
 * Test suite for Server-Sent Events (SSE) template streaming in Anza.
 * Verifies that streamed server templates update component state,
 * triggers reactive subscriptions, and safely re-renders the Shadow DOM.
 */

import { state } from '../../../src/core/state/index.js';
import { TagsCache } from '../../../src/core/ui/define/proxy.js';

describe('Server-Sent Events (SSE) Template Streaming', () => {
  it('receives streamed template events and updates component state and DOM', async () => {
    // Component container with Shadow DOM
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <div class="stream-wrapper">
        <header><h3>Live SSE Stream</h3></header>
        <section id="stream-target"><p class="loading">Awaiting server template...</p></section>
      </div>
    `;
    document.body.appendChild(host);

    const cache = new TagsCache(shadow);
    const store = state.create({ template: '', count: 0 });

    // Reactive subscription to template state
    store.subscribe('template', (html) => {
      if (html) {
        cache.one('#stream-target').innerHTML = html;
      }
    });

    // Mock EventSource stream simulator
    class MockSSEStream extends EventTarget {
      constructor() {
        super();
      }
      simulateMessage(event, data) {
        const msgEvent = new MessageEvent(event, { data: JSON.stringify(data) });
        this.dispatchEvent(msgEvent);
      }
    }

    const stream = new MockSSEStream();

    stream.addEventListener('template', (e) => {
      const payload = JSON.parse(e.data);
      store.set('template', payload.html);
      store.set('count', store.get('count') + 1);
    });

    // 1. Initial template arrival containing custom element tags
    stream.simulateMessage('template', {
      slot: 'stream-target',
      html: '<ui-card><ui-badge slot="header" variant="success">Active Stream</ui-badge><p>Connected</p><ui-progress value="25" max="100"></ui-progress></ui-card>'
    });

    // Wait for microtask queue
    await Promise.resolve();

    const targetEl = cache.one('#stream-target');
    if (!targetEl.querySelector('ui-card') || !targetEl.querySelector('ui-badge')) {
      throw new Error(`Expected custom elements ui-card and ui-badge rendered, got: ${targetEl.innerHTML}`);
    }
    if (store.get('count') !== 1) {
      throw new Error(`Expected count 1, got ${store.get('count')}`);
    }

    // 2. Incremental template update with progress advancement
    stream.simulateMessage('template', {
      slot: 'stream-target',
      html: '<ui-card><ui-badge slot="header" variant="warning">Tick #2</ui-badge><p>Processing</p><ui-progress value="85" max="100"></ui-progress></ui-card>'
    });

    await Promise.resolve();

    if (!targetEl.querySelector('ui-badge[variant="warning"]')) {
      throw new Error(`Expected updated ui-badge with warning variant, got: ${targetEl.innerHTML}`);
    }
    if (store.get('count') !== 2) {
      throw new Error(`Expected count 2, got ${store.get('count')}`);
    }

    host.remove();
  });
});
