/**
 * tests/core/offline/sync.test.js
 *
 * Core Background Sync fallback coordinator test suite.
 */

import { sync } from '@anzaui/anza/offline';

describe('Background Sync Manager', () => {
  let originalServiceWorker;
  let originalNavigator;

  beforeEach(() => {
    originalNavigator = globalThis.navigator;
    originalServiceWorker = globalThis.navigator?.serviceWorker;
  });

  afterEach(() => {
    if (originalNavigator) {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        configurable: true
      });
    }
  });

  it('should register a tag with Background Sync API if supported', async () => {
    let registeredTag = null;
    const mockSync = {
      register: async (tag) => {
        registeredTag = tag;
        return true;
      }
    };
    const mockRegistration = { sync: mockSync };

    const mockNavigator = {
      serviceWorker: {
        ready: Promise.resolve(mockRegistration)
      }
    };

    Object.defineProperty(globalThis, 'navigator', {
      value: mockNavigator,
      configurable: true
    });

    const result = await sync.register('test-sync-tag');
    if (result !== true) {
      throw new Error('Expected sync.register to resolve to true');
    }
    if (registeredTag !== 'test-sync-tag') {
      throw new Error(`Expected sync tag to be registered as "test-sync-tag", got: ${registeredTag}`);
    }
  });

  it('should fall back to window online listener if Background Sync is unsupported', async () => {
    // Nullify serviceWorker to force fallback path
    const mockNavigator = {
      serviceWorker: null
    };

    Object.defineProperty(globalThis, 'navigator', {
      value: mockNavigator,
      configurable: true
    });

    let fallbackTriggered = false;
    let fallbackTag = null;

    const dispose = sync.onSyncFallback((tag) => {
      fallbackTriggered = true;
      fallbackTag = tag;
    });

    const result = await sync.register('fallback-tag');
    if (result !== false) {
      throw new Error('Expected fallback register to resolve to false');
    }

    // Trigger standard window online event to fire the fallback
    window.dispatchEvent(new Event('online'));

    if (!fallbackTriggered) {
      throw new Error('Expected onSyncFallback callback to be triggered');
    }
    if (fallbackTag !== 'fallback-tag') {
      throw new Error(`Expected fallback tag "fallback-tag", got: ${fallbackTag}`);
    }

    dispose();
  });

  it('should clean up fallback listener and abort hooks to prevent memory leaks', () => {
    const controller = new AbortController();
    const signal = controller.signal;

    let added = 0;
    let removed = 0;

    const originalAdd = window.addEventListener;
    const originalRemove = window.removeEventListener;

    window.addEventListener = function(type) {
      if (type === 'core:sync-fallback') added++;
      return originalAdd.apply(this, arguments);
    };

    window.removeEventListener = function(type) {
      if (type === 'core:sync-fallback') removed++;
      return originalRemove.apply(this, arguments);
    };

    const dispose = sync.onSyncFallback(() => {}, signal);

    if (added !== 1) {
      throw new Error(`Expected 1 core:sync-fallback listener added, got ${added}`);
    }

    dispose();

    if (removed !== 1) {
      throw new Error(`Expected 1 core:sync-fallback listener removed, got ${removed}`);
    }

    // Restore
    window.addEventListener = originalAdd;
    window.removeEventListener = originalRemove;
  });

  it('should clean up fallback listener when AbortSignal triggers', () => {
    const controller = new AbortController();
    const signal = controller.signal;

    let added = 0;
    let removed = 0;

    const originalAdd = window.addEventListener;
    const originalRemove = window.removeEventListener;

    window.addEventListener = function(type) {
      if (type === 'core:sync-fallback') added++;
      return originalAdd.apply(this, arguments);
    };

    window.removeEventListener = function(type) {
      if (type === 'core:sync-fallback') removed++;
      return originalRemove.apply(this, arguments);
    };

    sync.onSyncFallback(() => {}, signal);

    if (added !== 1) {
      throw new Error(`Expected 1 core:sync-fallback listener added, got ${added}`);
    }

    controller.abort();

    if (removed !== 1) {
      throw new Error(`Expected 1 core:sync-fallback listener removed, got ${removed}`);
    }

    // Restore
    window.addEventListener = originalAdd;
    window.removeEventListener = originalRemove;
  });
});
