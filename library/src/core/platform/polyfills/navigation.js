/**
 * core/platform/polyfills/navigation.js
 *
 * A lightweight History-API based polyfill for the WICG Navigation API.
 * Provides the event system, navigate interception, and click delegation.
 * Source: doc 18 §3, library2.md §Phase 1-A
 */

import { globals } from '../globals.js';

class NavigationEvent extends Event {
  constructor(type, init) {
    super(type, init);
    this.destination = init.destination;
    this.navigationType = init.navigationType || 'push';
    this.signal = init.signal;
    this.userInitiated = init.userInitiated !== false;
    this.canIntercept = init.canIntercept !== false;
    this.hashChange = init.hashChange || false;
    this.downloadRequest = init.downloadRequest || false;
    this._intercepted = false;
    this._handlers = [];
  }

  intercept(options) {
    this._intercepted = true;
    if (options && typeof options.handler === 'function') {
      this._handlers.push(options.handler);
    }
  }
}

class NavigationPolyfill extends EventTarget {
  constructor() {
    super();
    if (typeof document !== 'undefined') {
      // Global click delegation for same-origin anchor links
      const onClick = (e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const anchor = e.target.closest('a[href]');
        if (!anchor) return;

        // Skip non-HTTP links and external targets
        if (anchor.target && anchor.target !== '_self') return;

        try {
          const url = new URL(anchor.href, globalThis.location.href);
          if (url.origin !== globalThis.location.origin) return;

          const event = this._fireNavigate(url.href, { navigationType: 'push' });
          if (event._intercepted) {
            e.preventDefault();
            history.pushState(null, '', url.href);
            this._runHandlers(event);
          }
        } catch {
          // ignore parsing error, let native navigation handle it
        }
      };

      document.addEventListener('click', onClick);
      globals.attach('router.nav-click', {
        type: 'listener',
        target: document,
        dispose: () => document.removeEventListener('click', onClick)
      });

      // Browser forward/back traversal support
      const onPopState = (e) => {
        const event = this._fireNavigate(globalThis.location.href, {
          navigationType: 'traverse',
          state: e.state
        });
        if (event._intercepted) {
          this._runHandlers(event);
        }
      };

      window.addEventListener('popstate', onPopState);
      globals.attach('router.nav-popstate', {
        type: 'listener',
        target: window,
        dispose: () => window.removeEventListener('popstate', onPopState)
      });
    }
  }

  get canGoBack() {
    return true;
  }

  get canGoForward() {
    return true;
  }

  navigate(url, options = {}) {
    try {
      const targetUrl = new URL(url, globalThis.location.href).href;
      const event = this._fireNavigate(targetUrl, {
        navigationType: options.history === 'replace' ? 'replace' : 'push',
        state: options.state
      });

      if (event._intercepted) {
        if (options.history === 'replace') {
          history.replaceState(options.state, '', targetUrl);
        } else {
          history.pushState(options.state, '', targetUrl);
        }
        this._runHandlers(event);
      } else {
        globalThis.location.href = targetUrl;
      }
    } catch (err) {
      this.dispatchEvent(new ErrorEvent('navigateerror', { error: err }));
    }
  }

  back() {
    history.back();
  }

  forward() {
    history.forward();
  }

  go(delta) {
    history.go(delta);
  }

  _fireNavigate(url, { navigationType, state } = {}) {
    const controller = new AbortController();
    const event = new NavigationEvent('navigate', {
      cancelable: true,
      destination: { url, state },
      navigationType,
      signal: controller.signal
    });
    this.dispatchEvent(event);
    return event;
  }

  async _runHandlers(event) {
    try {
      for (const handler of event._handlers) {
        await handler();
      }
      this.dispatchEvent(new Event('navigatesuccess'));
    } catch (err) {
      this.dispatchEvent(new ErrorEvent('navigateerror', { error: err }));
    }
  }
}

if (!globalThis.navigation) {
  globalThis.navigation = new NavigationPolyfill();
}
export default NavigationPolyfill;
