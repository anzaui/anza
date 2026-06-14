/**
 * src/core/router/intercept.js
 *
 * Core navigation interceptor loop.
 * Attaches listeners to the Navigation API 'navigate' event, evaluates security
 * guards, manages loading indicators, and performs updates wrapped in view transitions.
 *
 * Source: doc 09 — Routing §2, §5, §9, §13
 */

import { match } from './match.js';
import { transitions } from './transitions.js';
import { getContainer } from './container.js';
import { get as graphGet } from './graph.js';
import { isCallback, runCallback } from './handler.js';
import { boot, reset as resetBoot } from './boot.js';
import { ensure } from './cascade.js';
import { specRegistry } from '../ui/define/state.js';

/**
 * Built-in minimal 404 HTML rendered when no user notfound is configured.
 * Kept intentionally plain so it inherits the app's base typography.
 */
const DEFAULT_NOTFOUND_HTML = `
  <div style="
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    min-height:60vh;gap:1rem;padding:2rem;text-align:center;font-family:inherit;
  ">
    <span style="font-size:3rem;font-weight:800;opacity:.15;">404</span>
    <p style="margin:0;font-size:1rem;opacity:.5;">Page not found</p>
    <a href="/" style="font-size:.875rem;opacity:.6;text-decoration:none;">← Go home</a>
  </div>
`;

/**
 * Wraps a plain array with non-enumerable `first`, `last`, and named
 * index getters. Mirrors spec.js makeAccessorArray for use in the router.
 *
 * @param {any[]} values
 * @param {string[]} names
 */
function makeAccessorArray(values, names) {
  const arr = [...values];
  Object.defineProperties(arr, {
    first: { get() { return arr[0] ?? null; }, enumerable: false },
    last:  { get() { return arr[arr.length - 1] ?? null; }, enumerable: false },
  });
  names.forEach((name, i) => {
    if (!(name in arr)) {
      Object.defineProperty(arr, name, {
        get() { return arr[i] ?? null; },
        enumerable: false,
      });
    }
  });
  return arr;
}

/**
 * Casts a URL string value to the declared type.
 * @param {string} value
 * @param {'string'|'number'} cast
 */
function castValue(value, cast) {
  if (cast === 'number') {
    const n = Number(value);
    return Number.isNaN(n) ? value : n;
  }
  return value;
}

/**
 * Builds the typed params and query context arrays for a matched route.
 *
 * Reads the component's declared `params`/`query` contract from specRegistry.
 * Falls back to the raw match params/query objects for undeclared segments.
 *
 * @param {string} tag - custom element tag
 * @param {object} rawParams - raw segment map from trie/URLPattern match
 * @param {URL|string} url - the matched URL (or string)
 * @returns {{ params: any[], query: any[], raw: URLSearchParams }}
 */
function buildRouteContext(tag, rawParams, url) {
  const spec = specRegistry.get(tag);
  const paramDecls = spec?.params ?? [];
  const queryDecls = spec?.query ?? [];

  // Build the URLSearchParams object from the URL.
  let searchParams;
  try {
    const u = url instanceof URL ? url : new URL(url, globalThis.location?.href || 'http://localhost');
    searchParams = u.searchParams;
  } catch (_) {
    searchParams = new URLSearchParams();
  }

  // Build params array from declarations in order, casting as needed.
  // Undeclared segments that appear in rawParams are appended at the end.
  let params;
  if (paramDecls.length > 0) {
    const declared = new Set(paramDecls.map(d => d.name));
    const declaredValues = paramDecls.map(({ name, cast }) => {
      const raw = rawParams[name];
      return raw !== undefined ? castValue(raw, cast) : null;
    });
    // Append undeclared segments as strings so they remain accessible by index.
    const extra = Object.entries(rawParams)
      .filter(([k]) => !declared.has(k))
      .map(([, v]) => v);
    const allValues = [...declaredValues, ...extra];
    const allNames = [...paramDecls.map(d => d.name)];
    params = makeAccessorArray(allValues, allNames);
  } else {
    // No contract declared: expose raw params as an ordered array (string values).
    const entries = Object.entries(rawParams ?? {});
    params = makeAccessorArray(entries.map(([, v]) => v), entries.map(([k]) => k));
  }

  // Build query array from declarations in order, casting as needed.
  let query;
  if (queryDecls.length > 0) {
    const declared = new Set(queryDecls.map(d => d.name));
    const declaredValues = queryDecls.map(({ name, cast }) => {
      const raw = searchParams.get(name);
      return raw !== null ? castValue(raw, cast) : null;
    });
    // Extra undeclared query keys appended as strings.
    const extra = [];
    for (const [k, v] of searchParams.entries()) {
      if (!declared.has(k)) extra.push(v);
    }
    const allValues = [...declaredValues, ...extra];
    const allNames = [...queryDecls.map(d => d.name)];
    query = makeAccessorArray(allValues, allNames);
  } else {
    // No contract: flat array of all query values in iteration order.
    const entries = [...searchParams.entries()];
    query = makeAccessorArray(entries.map(([, v]) => v), entries.map(([k]) => k));
  }

  return { params, query, raw: searchParams };
}

/**
 * Pushes params and query values reactively onto a live element instance
 * without re-instantiating it. Used for layout-invariant param-only navigations.
 *
 * @param {HTMLElement} el - the live element
 * @param {string} tag - for looking up the contract in specRegistry
 * @param {object} rawParams - raw segment map
 * @param {URL|string} url - the target URL
 */
function pushToElement(el, tag, rawParams, url) {
  const spec = specRegistry.get(tag);
  const paramDecls = spec?.params ?? [];
  const queryDecls = spec?.query ?? [];

  let searchParams;
  try {
    const u = url instanceof URL ? url : new URL(url, globalThis.location?.href || 'http://localhost');
    searchParams = u.searchParams;
  } catch (_) {
    searchParams = new URLSearchParams();
  }

  // Push path params.
  for (const { name, cast } of paramDecls) {
    const raw = rawParams[name];
    if (raw !== undefined) el[name] = castValue(raw, cast);
  }
  // Push any undeclared params as strings.
  const declaredNames = new Set(paramDecls.map(d => d.name));
  for (const [k, v] of Object.entries(rawParams ?? {})) {
    if (!declaredNames.has(k)) el[k] = v;
  }

  // Push query params.
  for (const { name, cast } of queryDecls) {
    const raw = searchParams.get(name);
    if (raw !== null) el[name] = castValue(raw, cast);
  }
}

/**
 * Renders the not-found fallback into the deepest currently-live container.
 * Walks the graph from the deepest live node upward until it finds a mounted
 * dock element, then swaps a notfound div into it.
 *
 * Each dock may expose a static `notfound` property (set by dock() when the
 * user supplies a notfound config). The deepest configured one wins.
 *
 * @param {string} [activeContainer='main'] - hint: the last-active container.
 */
function renderNotFound(activeContainer = 'main') {
  // Walk from the hinted container upward until we find a live element.
  let name = activeContainer;
  let host = null;
  const visited = new Set();
  while (name && !visited.has(name)) {
    visited.add(name);
    const el = getContainer(name);
    if (el && el.isConnected) { host = el; break; }
    const node = graphGet(name);
    name = node?.parent?.name ?? null;
  }
  if (!host) {
    // Last resort: use the root main element directly.
    host = document.getElementById('main');
  }
  if (!host) return;

  // Build the notfound element. Check for a user-defined template on the
  // host element's class (set by dock() via the notfound config option).
  const Cls = host.constructor;
  const userHtml = Cls?.notfound ?? null;
  const html = typeof userHtml === 'string' ? userHtml : DEFAULT_NOTFOUND_HTML;

  const wrapper = document.createElement('div');
  wrapper.setAttribute('role', 'status');
  wrapper.setAttribute('aria-label', 'Page not found');
  wrapper.innerHTML = html;

  if (typeof host.swap === 'function') {
    host.swap(wrapper);
  } else {
    host.replaceChildren(wrapper);
  }
}

let guards = [];
let notFoundHandler = null;
let ready = false;
let transformers = [];

// Module-level root slots — captured once in setup(), cleared in destroy().
let win   = null;
let shell = null;   // WeakRef<HTMLElement> — points to <main id="main">

/** Returns the live <main id="main"> element, or null if GC'd. */
export function getShell() { return shell?.deref() ?? null; }

/** Returns the captured window reference. */
export function getWin()   { return win; }

// Navigation API listener references for teardown
let navListener = null;
let successListener = null;
let errorListener = null;

const listeners = {
  found: new Set(),
  notfound: new Set(),
  error: new Set()
};

/**
 * Registers an event listener on the router.
 * Supported events: 'found', 'notfound', 'error'.
 * Returns a disposer. Supports auto-cleanup via AbortSignal.
 */
export function on(type, callback, signal) {
  if (!listeners[type]) return () => {};

  listeners[type].add(callback);

  const dispose = () => {
    listeners[type].delete(callback);
    signal?.removeEventListener('abort', dispose);
  };

  if (signal) {
    signal.addEventListener('abort', dispose, { once: true });
  }

  return dispose;
}

/**
 * Emits an event to registered router listeners.
 */
export function emit(type, detail) {
  if (!listeners[type]) return;
  for (const callback of Array.from(listeners[type])) {
    try {
      callback(detail);
    } catch (err) {
      console.error(`Error in router event listener for "${type}":`, err);
    }
  }
}

/**
 * Registers a global navigation guard. Returns a disposer.
 * Guards receive (destination, controller) and return a redirect URL if blocked,
 * or null/undefined to allow.
 */
export function addGuard(guardFn) {
  guards.push(guardFn);
  return () => {
    const idx = guards.indexOf(guardFn);
    if (idx !== -1) guards.splice(idx, 1);
  };
}

/**
 * Registers a global route transformer. Transformers can modify matched route metadata dynamically.
 */
export function addTransformer(fn) {
  transformers.push(fn);
  return () => {
    const idx = transformers.indexOf(fn);
    if (idx !== -1) transformers.splice(idx, 1);
  };
}

/** Grouped guard API. */
export const guardsApi = {
  add: addGuard,
  clear() { guards = []; }
};

/**
 * Sets the default handler for unmatched routes (404 page). Returns a disposer.
 */
export function setNotFound(handler) {
  notFoundHandler = handler;
  return () => {
    if (notFoundHandler === handler) notFoundHandler = null;
  };
}

/** Grouped miss API. */
export const missApi = {
  set: setNotFound,
  clear() { notFoundHandler = null; }
};

/**
 * Attaches the global window.navigation navigate listener.
 * Idempotent — safe to call multiple times.
 */
export function setup() {
  if (ready) return;
  if (typeof window === 'undefined' || !window.navigation) return;
  ready = true;

  win   = window;
  const mainEl = document.getElementById('main');
  // Only wrap in WeakRef when the element exists. setup() may be called at
  // module-evaluation time (before DOMContentLoaded), so the element may not
  // be in the DOM yet. anchor() in boot.js is the authoritative check that
  // throws if the element is absent at boot time.
  if (mainEl) shell = new WeakRef(mainEl);
  navListener = (event) => {
    // Only intercept same-origin navigations that the browser would otherwise
    // follow as a full page load. External links, file downloads, and
    // same-document hash scrolls are intentionally left to the browser.
    if (!event.canIntercept || event.hashChange || event.downloadRequest) {
      return;
    }
    // Guard: only intercept same-origin URLs. Cross-origin clicks must
    // navigate normally (open in browser / new tab).
    try {
      const dest = new URL(event.destination.url);
      if (dest.origin !== location.origin) return;
    } catch (_) { return; }

    const url = event.destination.url;
    let precommitted = false; // Scoped precommitted guard state (RT-02)

    // Build intercept options. precommitHandler is only valid on cancelable
    // events (Navigation API spec §4.3). Including it unconditionally throws
    // InvalidStateError on non-cancelable navigations (e.g. back/forward).
    const interceptOpts = {
      /**
       * Executes DOM mutations, layout changes, and provides fallbacks for Safari.
       * Always provided — this is what prevents the browser from reloading.
       */
      handler() {
        // Return the promise representing the navigation work so the Navigation
        // API (and success/error events) properly wait for DOM updates to complete.
        return (async () => {
          const destination = event.destination;
          let routeMatch = null;
          try {
            routeMatch = await match(destination.url);
          } catch (err) {
            emit('error', { error: err, url: destination.url, route: null, phase: 'match' });
            return;
          }

          if (routeMatch) {
            for (const fn of transformers) {
              try { fn(routeMatch); } catch (e) { console.error(e); }
            }
          }

          // Layout resolution: ensure the route's container chain is mounted.
          let chain = [];
          if (routeMatch) {
            const meta = routeMatch.route?.meta ?? {};
            chain = Array.isArray(meta.via) && meta.via.length
              ? meta.via
              : (meta.container ? [meta.container] : []);

            try {
              for (let i = 0; i < chain.length; i++) {
                if (!getContainer(chain[i])) {
                  await ensure(chain[i], chain[i - 1] ?? 'main');
                }
              }
            } catch (err) {
              emit('error', { error: err, url: destination.url, route: routeMatch.route, phase: 'container' });
              throw err;
            }
          }

          // Graceful Safari Fallback: run guards post-commit when precommit was skipped.
          if (!precommitted) {
            for (const guardFn of guards) {
              let redirectUrl;
              try {
                redirectUrl = await guardFn(destination, null);
              } catch (err) {
                emit('error', { error: err, url: destination.url, route: routeMatch?.route ?? null, phase: 'guard' });
                return;
              }
              if (redirectUrl) {
                window.navigation.navigate(redirectUrl, { history: 'replace' });
                return;
              }
            }
          }

          await transitions.run(async () => {
            if (routeMatch) {
              // Run callback handlers exactly once, here (never during match()).
              if (isCallback(routeMatch.route.handler)) {
                try {
                  await runCallback(routeMatch.route.handler, routeMatch.params, event);
                } catch (err) {
                  emit('error', { error: err, url: destination.url, route: routeMatch.route, phase: 'handler' });
                  return;
                }
              }

              const ctx = buildRouteContext(routeMatch.tag, routeMatch.params, destination.url);
              emit('found', {
                tag: routeMatch.tag,
                params: ctx.params,
                query: ctx.query,
                raw: ctx.raw,
                hash: routeMatch.hash,
                chain: routeMatch.chain,
                via: chain,
                container: chain.at(-1) ?? null,
                url: destination.url,
                direction: event.navigationType
              });
            } else {
              // Not found — render in-place without a browser reload.
              // The URL has already committed in the address bar.
              emit('notfound', { url: destination.url });

              if (notFoundHandler) {
                await notFoundHandler(event);
              } else {
                // Built-in: render a 404 into the deepest live container.
                renderNotFound('main');
              }
            }
          });
        })();
      }
    };

    // Only attach precommitHandler on cancelable events (Navigation API §4.3).
    // Non-cancelable navigations (e.g. browser back/forward in some browsers)
    // throw InvalidStateError if precommitHandler is present.
    if (event.cancelable) {
      interceptOpts.precommitHandler = async function precommitHandler(controller) {
        precommitted = true;
        const destination = event.destination;
        for (const guardFn of guards) {
          const redirectUrl = await guardFn(destination, controller);
          if (redirectUrl) {
            controller.redirect(redirectUrl);
            return;
          }
        }
      };
    }

    event.intercept(interceptOpts);
  };

  successListener = () => {
    const url = window.navigation.currentEntry?.url;
    if (url) {
      import('./sync/index.js').then(({ coordinateConnections }) => {
        coordinateConnections(url);
      }).catch(() => {});
    }
  };

  errorListener = (event) => {
    const error = event.error;

    // Silence aborted/superseded navigation actions
    if (error && (error.name === 'AbortError' || error.message?.includes('aborted'))) {
      return;
    }

    console.error('Navigation error caught globally:', error);
    emit('error', { error, url: window.navigation.currentEntry?.url ?? null, route: null, phase: 'navigation' });

    import('../events/index.js').then(({ events }) => {
      events.emit('core:error', {
        code: 'NAVIGATION_FAILED',
        message: error?.message || 'Navigation failed',
        cause: error,
        context: { url: window.navigation.currentEntry?.url },
        recoverable: true
      });
    }).catch(() => {});
  };

  window.navigation.addEventListener('navigate', navListener);
  window.navigation.addEventListener('navigatesuccess', successListener);
  window.navigation.addEventListener('navigateerror', errorListener);

  // Trigger initial on-boot matching once the DOM is parsed and every gated
  // prerequisite (element definitions registered via boot.gate) has settled.
  // Deferring this past DOMContentLoaded is what survives a hard refresh on a
  // deep route — the first match no longer races element registration.
  boot(async () => {
    const url = window.navigation.currentEntry?.url || window.location.href;
    const routeMatch = await match(url);
    if (routeMatch) {
      for (const fn of transformers) {
        try { fn(routeMatch); } catch (e) { console.error(e); }
      }
      const meta = routeMatch.route?.meta ?? {};
      const chain = Array.isArray(meta.via) && meta.via.length
        ? meta.via
        : (meta.container ? [meta.container] : []);

      // Layout resolution: ensure the route's container chain is mounted on boot.
      try {
        for (let i = 0; i < chain.length; i++) {
          if (!getContainer(chain[i])) {
            await ensure(chain[i], chain[i - 1] ?? 'main');
          }
        }
      } catch (err) {
        emit('error', { error: err, url, route: routeMatch.route, phase: 'container' });
        throw err;
      }

      const ctx = buildRouteContext(routeMatch.tag, routeMatch.params, url);
      emit('found', {
        tag: routeMatch.tag,
        params: ctx.params,
        query: ctx.query,
        raw: ctx.raw,
        hash: routeMatch.hash,
        chain: routeMatch.chain,
        via: chain,
        container: chain.at(-1) ?? null,
        url,
        direction: 'load'
      });
    } else {
      emit('notfound', { url });
      renderNotFound('main');
    }
  });
}

/**
 * Tears down all navigation listeners and resets router state.
 * Useful for test isolation and SSR teardown.
 */
export function destroy() {
  if (!ready) return;
  ready = false;
  win   = null;
  shell = null;
  if (typeof window !== 'undefined' && window.navigation) {
    if (navListener) window.navigation.removeEventListener('navigate', navListener);
    if (successListener) window.navigation.removeEventListener('navigatesuccess', successListener);
    if (errorListener) window.navigation.removeEventListener('navigateerror', errorListener);
  }

  navListener = null;
  successListener = null;
  errorListener = null;

  guards = [];
  transformers = [];
  notFoundHandler = null;
  resetBoot();

  for (const set of Object.values(listeners)) {
    set.clear();
  }

  // Close sync channel via dynamic import (avoids circular dep at module load)
  import('./sync/tab.js').then(m => m.close?.()).catch(() => {});
}

class TransitionController {
  constructor(url, navigationPromise) {
    this.url = url;
    this.promise = navigationPromise;
    this.listeners = {
      found: [],
      notfound: [],
      error: []
    };

    const getPath = (u) => {
      try { return new URL(u, window.location.href).pathname; } catch (_) { return u; }
    };

    // Coordinate with Navigation events using standard on() mechanism (RT-01)
    const disposeFound = on('found', (detail) => {
      if (getPath(detail.url) === getPath(this.url)) {
        cleanup();
        this._dispatch('found', detail);
      }
    });

    const disposeNotFound = on('notfound', (detail) => {
      if (getPath(detail.url) === getPath(this.url)) {
        cleanup();
        this._dispatch('notfound', detail);
      }
    });

    const disposeError = on('error', (detail) => {
      cleanup();
      this._dispatch('error', detail.error);
    });

    const cleanup = () => {
      disposeFound();
      disposeNotFound();
      disposeError();
    };

    this.promise.catch((err) => {
      cleanup();
      this._dispatch('error', err);
    });
  }

  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
    return this;
  }

  _dispatch(event, payload) {
    for (const cb of this.listeners[event]) {
      try {
        cb(payload);
      } catch (err) {
        console.error(`Error inside fluent navigation "${event}" handler:`, err);
      }
    }
  }
}

let navigateCallback = null;

export function registerNavigator(cb) {
  navigateCallback = cb;
}

export const nav = {
  to(url, options) {
    if (!navigateCallback) {
      console.warn('[Router] Navigator is not registered yet. Falling back to dynamic import.');
      return new TransitionController(url, import('./history.js').then(m => m.navigate(url, options)));
    }
    const result = navigateCallback(url, options);
    const p = result instanceof Promise ? result : Promise.resolve(result);
    return new TransitionController(url, p);
  }
};
