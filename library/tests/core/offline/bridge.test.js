/**
 * tests/core/offline/bridge.test.js
 *
 * Core Service Worker Message Bridge test suite.
 */

import { bridge } from '@anzaui/anza/offline';

describe('Service Worker Message Bridge', () => {
  let originalNavigator;

  beforeEach(() => {
    originalNavigator = globalThis.navigator;
  });

  afterEach(() => {
    if (originalNavigator) {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        configurable: true
      });
    }
  });

  it('should reject with an error when no active Service Worker controller is present', async () => {
    const mockNavigator = {
      serviceWorker: {
        controller: null
      }
    };

    Object.defineProperty(globalThis, 'navigator', {
      value: mockNavigator,
      configurable: true
    });

    try {
      await bridge.send('some-task', { data: 123 });
      throw new Error('Expected bridge.send to throw');
    } catch (err) {
      if (!err.message.includes('Active Service Worker controller not found')) {
        throw err;
      }
    }
  });

  it('should resolve the promise when the message channel receives a success response', async () => {
    let sentMessage = null;
    let sentTransferables = null;

    const mockController = {
      postMessage: (message, transferables) => {
        sentMessage = message;
        sentTransferables = transferables;

        // Simulate a successful response on the provided port
        setTimeout(() => {
          message.port.postMessage({
            success: true,
            result: 'resolved-value'
          });
        }, 10);
      }
    };

    const mockNavigator = {
      serviceWorker: {
        controller: mockController
      }
    };

    Object.defineProperty(globalThis, 'navigator', {
      value: mockNavigator,
      configurable: true
    });

    const result = await bridge.send('process-data', { foo: 'bar' });
    if (result !== 'resolved-value') {
      throw new Error(`Expected resolved-value, got: ${result}`);
    }

    if (sentMessage.task !== 'process-data') {
      throw new Error(`Expected task "process-data", got: ${sentMessage.task}`);
    }

    if (sentMessage.payload.foo !== 'bar') {
      throw new Error(`Expected payload foo to be "bar", got: ${sentMessage.payload.foo}`);
    }

    if (!sentTransferables || sentTransferables.length !== 1) {
      throw new Error('Expected 1 transferable port');
    }
  });

  it('should reject the promise when the message channel receives a failed response', async () => {
    const mockController = {
      postMessage: (message) => {
        setTimeout(() => {
          message.port.postMessage({
            success: false,
            error: 'Server unavailable'
          });
        }, 10);
      }
    };

    const mockNavigator = {
      serviceWorker: {
        controller: mockController
      }
    };

    Object.defineProperty(globalThis, 'navigator', {
      value: mockNavigator,
      configurable: true
    });

    try {
      await bridge.send('failing-task');
      throw new Error('Expected bridge.send to reject');
    } catch (err) {
      if (!err.message.includes('Server unavailable')) {
        throw err;
      }
    }
  });

  it('should reject the promise when the message channel triggers onmessageerror', async () => {
    const originalMessageChannel = globalThis.MessageChannel;

    // Stub MessageChannel to trigger onmessageerror manually
    globalThis.MessageChannel = class {
      constructor() {
        this.port1 = {
          close: () => {},
          set onmessageerror(fn) {
            setTimeout(fn, 10);
          },
          set onmessage(fn) {}
        };
        this.port2 = {};
      }
    };

    const mockController = {
      postMessage: () => {}
    };

    const mockNavigator = {
      serviceWorker: {
        controller: mockController
      }
    };

    Object.defineProperty(globalThis, 'navigator', {
      value: mockNavigator,
      configurable: true
    });

    try {
      await bridge.send('corrupted-task');
      throw new Error('Expected bridge.send to reject');
    } catch (err) {
      if (!err.message.includes('Deserialization error on Service Worker message channel')) {
        throw err;
      }
    } finally {
      globalThis.MessageChannel = originalMessageChannel;
    }
  });
});
