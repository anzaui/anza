/**
 * tests/core/router/boot.test.js
 *
 * Test suite for application booting, anchor resolution, gates, and initial matching.
 *
 * Source: tasks.md Phase 1 / Migration 2
 */

import { boot, gate, ready, reset } from '../../../src/core/router/boot.js';
import { root } from '../../../src/core/router/graph.js';
import { router } from '../../../src/core/router/index.js';
import { clearContainers } from '../../../src/core/router/container.js';

describe('Router Boot Sequence', () => {
  let shell;
  let main;
  let original;
  let mock;

  beforeEach(() => {
    // Save and remove the test runner's main element to avoid collision.
    shell = document.getElementById('main');
    if (shell) {
      shell.remove();
    }

    // Create a new main element for this specific test.
    main = document.createElement('main');
    main.id = 'main';
    document.body.appendChild(main);

    router.destroy();
    router.clear();
    clearContainers();
    reset();

    // Mock Navigation API for testing boot and setup behavior
    mock = {
      currentEntry: { url: 'http://localhost/' },
      addEventListener: () => {},
      removeEventListener: () => {},
      navigate: () => ({ committed: Promise.resolve(), finished: Promise.resolve() })
    };

    original = globalThis.navigation;
    globalThis.navigation = mock;
  });

  afterEach(() => {
    router.destroy();
    router.clear();
    clearContainers();
    reset();

    globalThis.navigation = original;

    if (main) {
      main.remove();
      main = null;
    }

    // Restore the test runner's main element.
    if (shell) {
      document.body.appendChild(shell);
      shell = null;
    }
  });

  it('throws a clear error if <main id="main"> is missing at anchor time', async () => {
    if (main) {
      main.remove();
      main = null;
    }

    let error = null;
    const handler = (e) => {
      error = e.reason;
      e.preventDefault();
    };

    window.addEventListener('unhandledrejection', handler);

    boot(() => {});

    // Wait a brief period for the async boot to reject
    await new Promise(r => setTimeout(r, 10));

    window.removeEventListener('unhandledrejection', handler);

    if (!error) {
      throw new Error('Expected boot to fail hard when <main id="main"> is absent');
    }

    if (!error.message.includes('<dock-main id="main"> is required')) {
      throw new Error(`Expected specific router main required error, got: ${error.message}`);
    }
  });

  it('wires <main id="main"> into the hierarchical graph on boot', async () => {
    if (ready()) {
      throw new Error('Expected router to not be ready before boot');
    }

    boot(() => {});

    // Wait for the async setTimeout(launch, 0)
    await new Promise(r => setTimeout(r, 0));

    if (!ready()) {
      throw new Error('Expected router to be ready after boot');
    }

    if (!root.ref) {
      throw new Error('Expected root node reference to be populated after boot');
    }

    const el = root.ref.deref();
    if (el !== main) {
      throw new Error('Expected root node reference to dereference to the main element');
    }

    const registered = router.getContainer('main');
    if (registered !== main) {
      throw new Error('Expected main container to be registered in the registry');
    }
  });

  it('resolves deferred gates before firing the initial match', async () => {
    let resolved = false;
    const promise = new Promise(resolve => {
      setTimeout(() => {
        resolved = true;
        resolve();
      }, 50);
    });

    gate(promise);

    let fired = false;
    let resolve;
    const wait = new Promise(r => { resolve = r; });

    boot(async () => {
      fired = true;
      if (!resolved) {
        throw new Error('Expected gates to be resolved before initial match is fired');
      }
      resolve();
    });

    await wait;

    if (!fired) {
      throw new Error('Expected initial match function to fire');
    }
  });

  it('continues boot sequence even when a gate rejects', async () => {
    const error = new Error('Gate rejection mock');
    const promise = Promise.reject(error);

    gate(promise);

    let fired = false;
    let resolve;
    const wait = new Promise(r => { resolve = r; });

    boot(async () => {
      fired = true;
      resolve();
    });

    await wait;

    if (!fired) {
      throw new Error('Expected initial match function to fire despite a gate rejection');
    }
  });

  it('verifies that the initial route matching matches the active document URL', async () => {
    const path = '/boot-test-url';
    mock.currentEntry = { url: `http://localhost${path}` };

    let detail = null;
    let resolve;
    const wait = new Promise(r => { resolve = r; });

    router.register(path, 'test-tag');
    router.on('found', (d) => {
      detail = d;
      resolve();
    });

    router.setup();

    await wait;

    if (!detail) {
      throw new Error('Expected route match to be found');
    }

    if (detail.tag !== 'test-tag') {
      throw new Error(`Expected tag "test-tag", got "${detail.tag}"`);
    }

    if (detail.direction !== 'load') {
      throw new Error(`Expected direction to be "load", got "${detail.direction}"`);
    }
  });
});
