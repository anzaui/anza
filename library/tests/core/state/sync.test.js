/**
 * tests/core/state/sync.test.js
 *
 * Core cross-tab state sync execution test suite.
 *
 * Source: plan.md Phase 6-A, core/state/sync.js
 */

import { sync, ReactiveStore } from '@anzaui/anza/state';

describe('Cross-Tab State Sync', () => {
  let originalBroadcastChannel;
  let sentMessages = [];
  let currentInstance;

  before(() => {
    originalBroadcastChannel = globalThis.BroadcastChannel;
    
    // Polyfill/mock BroadcastChannel for tests consistency
    globalThis.BroadcastChannel = class MockBroadcastChannel {
      constructor(name) {
        this.name = name;
        currentInstance = this;
      }
      postMessage(msg) {
        sentMessages.push(msg);
      }
      close() {
        this.closed = true;
      }
    };
  });

  after(() => {
    globalThis.BroadcastChannel = originalBroadcastChannel;
  });

  beforeEach(() => {
    sentMessages = [];
    currentInstance = null;
  });

  it('should post local whitelisted mutations to the BroadcastChannel', () => {
    const store = new ReactiveStore({ text: 'init', ignored: 'val' });
    const dispose = sync(store, ['text']);

    // Trigger local mutation
    store.set('text', 'updated', 'local');

    if (sentMessages.length !== 1) {
      throw new Error(`Expected 1 broadcasted message, got ${sentMessages.length}`);
    }
    if (sentMessages[0].key !== 'text' || sentMessages[0].value !== 'updated') {
      throw new Error(`Expected text sync payload, got ${JSON.stringify(sentMessages[0])}`);
    }

    // Trigger non-whitelisted mutation
    store.set('ignored', 'changed', 'local');
    if (sentMessages.length !== 1) {
      throw new Error('Expected non-whitelisted keys to be skipped');
    }

    dispose();
  });

  it('should apply incoming broadcast messages and avoid infinite loops', () => {
    const store = new ReactiveStore({ text: 'init' });
    const dispose = sync(store, ['text']);

    // Simulate incoming replication payload from another tab
    currentInstance.onmessage({ data: { key: 'text', value: 'replicated' } });

    if (store.get('text') !== 'replicated') {
      throw new Error(`Expected text to become "replicated", got "${store.get('text')}"`);
    }

    // Crucial: Incoming broadcast updates should NOT post back out to avoid infinite sync echo loops
    if (sentMessages.length !== 0) {
      throw new Error(`Expected 0 circular posted messages, got ${sentMessages.length}`);
    }

    dispose();
  });
});
