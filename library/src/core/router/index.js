/**
 * src/core/router/index.js
 *
 * Public client-side routing entry point.
 * Aggregates route definition registry, guards, programmatic traversals,
 * and mounts global onnavigate interception listeners.
 *
 * Source: doc 09 — Routing §1, §2
 */

import { register, match, clear, getRoutes, load } from './match.js';
import {
  setup, destroy,
  addGuard, setNotFound,
  addTransformer,
  guardsApi, missApi, pagesApi,
  on, nav, registerNavigator,
  getShell, getWin
} from './intercept.js';
import {
  navigate,
  replace,
  back,
  forward,
  go,
  current,
  entries,
  canBack,
  canForward
} from './history.js';

import {
  setupTabSync,
  start as syncStart,
  stop as syncStop,
  active as syncActive,
  close as syncClose,
  registerConnection,
  getActiveConnections,
  clearConnections,
  links
} from './sync/index.js';

import {
  registerContainer,
  unregisterContainer,
  getContainer,
  clearContainers,
  hasContainer
} from './container.js';

import { cache, prefetch } from './cache.js';
import { transitions } from './transitions.js';
import { loadingApi } from './loading.js';

export const router = {
  // Registration and boundary hooks
  register,
  load,
  clear,
  guard: addGuard,
  notFound: setNotFound,
  transform: addTransformer,

  // Grouped APIs
  guards: guardsApi,
  miss: missApi,
  pages: pagesApi,
  loading: loadingApi,
  links,

  // Sync controls
  sync: {
    start: (r) => syncStart(r ?? router),
    stop: syncStop,
    active: syncActive,
    close: syncClose
  },

  // Programmatic history API
  navigate,
  replace,
  back,
  forward,
  go,
  current,
  entries,
  canBack,
  canForward,

  match,

  // Cache API integration (route/view asset caching)
  cache,
  prefetch,

  // View Transitions (document morph + shared helpers)
  transitions,

  // Event-driven subscription and navigation controllers
  on,
  nav,

  // Synchronization and coordination hooks
  registerConnection,
  getActiveConnections,
  clearConnections,

  // Advanced Container Topology API
  registerContainer,
  unregisterContainer,
  getContainer,
  clearContainers,
  hasContainer,

  // Lifecycle
  setup,
  destroy,

  // Root accessors — useful for components that need the shell element
  // without importing intercept directly.
  shell: getShell,   // router.shell() → <main id="main">
  win:   getWin      // router.win()   → window
};

// Auto-bootstrap client-side navigation listeners on client load
if (typeof window !== 'undefined') {
  // Expose the router globally so non-module scripts, devtools, and definition
  // helpers (page/dock) can reach it without importing. Non-enumerable and
  // non-configurable so it cannot be accidentally clobbered or redefined.
  if (!('router' in window)) {
    Object.defineProperty(window, 'router', {
      value: router,
      writable: false,
      enumerable: false,
      configurable: false
    });
  }

  registerNavigator(navigate);
  setup();
  setupTabSync(router);
}

export {
  navigate,
  replace,
  back,
  forward,
  go,
  current,
  entries,
  canBack,
  canForward,

  // match sub-module
  register,
  load,
  match,
  clear,
  getRoutes,
  // intercept sub-module
  addGuard,
  setNotFound,
  addTransformer as transform,
  setup,
  destroy,
  on,
  nav,
  guardsApi,
  missApi,
  pagesApi,
  loadingApi,
  // sync sub-module
  setupTabSync,
  registerConnection,
  getActiveConnections,
  clearConnections,
  links,
  // container sub-module
  registerContainer,
  unregisterContainer,
  getContainer,
  clearContainers,
  hasContainer,
  // cache sub-module
  cache,
  prefetch,
  // transitions
  transitions
};
