/**
 * tests/core/router/intercept.test.js
 *
 * Core router intercepts execution test suite.
 */

import { router } from '../../../src/core/router/index.js';
import { getContainer, registerContainer, clearContainers } from '../../../src/core/router/container.js';
import { reset as resetBoot } from '../../../src/core/router/boot.js';

/** Pipe runs in a queueMicrotask after handler() returns — flush it. */
async function flushPipe() {
  // match → ensure → beginLoading (async materialize) → emit; drain a few ticks.
  for (let i = 0; i < 6; i++) {
    await new Promise((r) => queueMicrotask(r));
  }
  await new Promise((r) => setTimeout(r, 0));
}

describe('Router Interceptor', () => {
  let originalNavigation;
  let mockNavigation;
  let listeners;
  let mainEl;

  beforeEach(() => {
    // Framework requires <main id="main"> for anchor().
    mainEl = document.createElement('main');
    mainEl.id = 'main';
    document.body.appendChild(mainEl);

    router.destroy();
    router.clear();
    clearContainers();
    resetBoot();

    listeners = {};
    mockNavigation = {
      addEventListener(type, cb) {
        listeners[type] = cb;
      },
      removeEventListener(type, cb) {
        if (listeners[type] === cb) {
          delete listeners[type];
        }
      },
      currentEntry: { url: 'http://localhost/' },
      navigate: () => ({ committed: Promise.resolve(), finished: Promise.resolve() })
    };

    originalNavigation = globalThis.navigation;
    globalThis.navigation = mockNavigation;
  });

  afterEach(() => {
    router.destroy();
    router.clear();
    clearContainers();
    resetBoot();
    globalThis.navigation = originalNavigation;
    mainEl.remove();
    mainEl = null;
  });

  it('setup() attaches one navigate listener and destroy() removes all listeners', () => {
    router.setup();

    if (typeof listeners.navigate !== 'function') {
      throw new Error('Expected setup to attach navigate listener');
    }
    if (typeof listeners.navigatesuccess !== 'function') {
      throw new Error('Expected setup to attach navigatesuccess listener');
    }
    if (typeof listeners.navigateerror !== 'function') {
      throw new Error('Expected setup to attach navigateerror listener');
    }

    router.destroy();

    if (listeners.navigate || listeners.navigatesuccess || listeners.navigateerror) {
      throw new Error('Expected destroy to remove all event listeners');
    }
  });

  it('evaluates guards and redirect calls controller.redirect', async () => {
    let guardCalled = false;
    router.guards.add((destination, controller) => {
      guardCalled = true;
      if (destination.url.includes('/admin')) {
        return '/login';
      }
      return null;
    });

    router.setup();

    // Simulate navigation event
    let redirectUrl = null;
    let precommitPromise = null;

    const mockEvent = {
      canIntercept: true,
      cancelable: true,
      hashChange: false,
      downloadRequest: false,
      destination: { url: new URL('/admin', globalThis.location?.href || 'http://localhost').href },
      intercept(options) {
        const controller = {
          redirect(url) {
            redirectUrl = url;
          }
        };
        precommitPromise = options.precommitHandler(controller);
      }
    };

    listeners.navigate(mockEvent);
    await precommitPromise;

    if (!guardCalled) {
      throw new Error('Expected navigation guard to be called');
    }

    if (redirectUrl !== '/login') {
      throw new Error(`Expected guard to trigger redirect to "/login", got "${redirectUrl}"`);
    }
  });

  it('handles Safari fallback when precommit is not supported/called', async () => {
    let guardCalled = false;
    router.guards.add((destination) => {
      guardCalled = true;
      if (destination.url.includes('/admin')) {
        return '/login';
      }
      return null;
    });

    let navigateUrl = null;
    let navigateOptions = null;
    mockNavigation.navigate = (url, options) => {
      navigateUrl = url;
      navigateOptions = options;
      return { committed: Promise.resolve(), finished: Promise.resolve() };
    };

    router.setup();

    let handlerPromise = null;
    const mockEvent = {
      canIntercept: true,
      hashChange: false,
      downloadRequest: false,
      destination: { url: new URL('/admin', globalThis.location?.href || 'http://localhost').href },
      intercept(options) {
        // In Safari, precommitHandler is NOT called, it goes straight to handler()
        handlerPromise = options.handler();
      }
    };

    listeners.navigate(mockEvent);
    await handlerPromise;
    await flushPipe();

    if (!guardCalled) {
      throw new Error('Expected navigation guard to be called in Safari fallback');
    }

    if (navigateUrl !== '/login' || navigateOptions?.history !== 'replace') {
      throw new Error('Expected replace navigation to login to be triggered in Safari fallback');
    }
  });

  it('triggers found, notfound, and error events in correct flow', async () => {
    let foundCalled = false;
    let notfoundCalled = false;
    let errorCalled = false;

    router.register('/user/:id', 'user-page');

    router.on('found', () => { foundCalled = true; });
    router.on('notfound', () => { notfoundCalled = true; });
    router.on('error', () => { errorCalled = true; });

    router.setup();

    // 1. Trigger valid found route
    let handlerPromise1 = null;
    const foundEvent = {
      canIntercept: true,
      hashChange: false,
      downloadRequest: false,
      destination: { url: new URL('/user/42', globalThis.location?.href || 'http://localhost').href },
      intercept(options) {
        handlerPromise1 = options.handler();
      }
    };
    listeners.navigate(foundEvent);
    await handlerPromise1;
    await flushPipe();

    if (!foundCalled) {
      throw new Error('Expected found event to fire');
    }

    // 2. Trigger invalid notfound route
    let handlerPromise2 = null;
    const notfoundEvent = {
      canIntercept: true,
      hashChange: false,
      downloadRequest: false,
      destination: { url: new URL('/not-registered', globalThis.location?.href || 'http://localhost').href },
      intercept(options) {
        handlerPromise2 = options.handler();
      }
    };
    listeners.navigate(notfoundEvent);
    await handlerPromise2;
    await flushPipe();

    if (!notfoundCalled) {
      throw new Error('Expected notfound event to fire');
    }
  });

  it('emits error event when required container is missing in DOM', async () => {
    let errorDetail = null;
    router.register('/dashboard', 'dash-page', { container: 'missing-sidebar' });

    router.on('error', (detail) => {
      errorDetail = detail;
    });

    router.setup();

    let handlerPromise = null;
    const mockEvent = {
      canIntercept: true,
      hashChange: false,
      downloadRequest: false,
      destination: { url: new URL('/dashboard', globalThis.location?.href || 'http://localhost').href },
      intercept(options) {
        handlerPromise = Promise.resolve(options.handler());
      }
    };

    listeners.navigate(mockEvent);
    await handlerPromise;
    await flushPipe();

    if (!errorDetail) {
      throw new Error('Expected error event to be emitted when container is missing');
    }

    if (errorDetail.phase !== 'container') {
      throw new Error(`Expected container phase, got ${errorDetail.phase}`);
    }
  });

  it('setup() loads Navigation polyfill when window.navigation is missing', async () => {
    // Simulate Firefox: no Navigation API until the platform polyfill installs.
    globalThis.navigation = undefined;
    const { supports, reset } = await import('../../../src/core/platform/supports.js');
    const descNav = Object.getOwnPropertyDescriptor(supports, 'navigationAPI');
    Object.defineProperty(supports, 'navigationAPI', { value: false, configurable: true });
    reset('navigationAPI');

    try {
      router.setup();

      const deadline = Date.now() + 3000;
      while (!globalThis.navigation && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 10));
      }
      if (!globalThis.navigation) {
        throw new Error('Expected Navigation polyfill to install after setup()');
      }

      // Allow the scheduled setup() retry to attach listeners.
      await new Promise((r) => setTimeout(r, 30));

      const nav = globalThis.navigation;
      let removed = 0;
      const origRemove = nav.removeEventListener.bind(nav);
      nav.removeEventListener = (type, cb) => {
        removed += 1;
        return origRemove(type, cb);
      };
      try {
        router.destroy();
      } finally {
        nav.removeEventListener = origRemove;
      }

      if (removed < 1) {
        throw new Error(
          'Expected setup() to attach navigate listeners after polyfill load (destroy removed none)'
        );
      }
    } finally {
      if (descNav) Object.defineProperty(supports, 'navigationAPI', descNav);
      reset('navigationAPI');
      globalThis.navigation = originalNavigation;
      router.destroy();
    }
  });
});
