/**
 * src/index.js
 *
 * Root entry of @anzaui/anza: a flat re-export of the core modules.
 * Theme, elements and the service worker helpers are separate subpaths.
 * Names exported by several modules would be dropped by `export *` (ES spec),
 * so each one is re-exported explicitly below from a single winner; the other
 * modules' versions stay available from their own subpath.
 *
 * Usage (after npm install @anzaui/anza):
 *   import { element, page, dock } from '@anzaui/anza';
 *   import { ReactiveStore }       from '@anzaui/anza/state';
 *   import { api }                 from '@anzaui/anza/api';
 */

export * from './core/api/index.js';
export * from './core/state/index.js';
export * from './core/events/index.js';
export * from './core/router/index.js';
export * from './core/storage/index.js';
export * from './core/offline/index.js';
export * from './core/animations/index.js';
export * from './core/workers/index.js';
export * from './core/security/index.js';
export * from './core/ui/index.js';
export * from './core/platform/index.js';

// Names shared by several modules: the namesake module wins, otherwise the
// most-used one. The others: '@anzaui/anza/offline' (state, sync),
// '/api' (sync, events, cache), '/state' (storage), '/animations' (view),
// '/platform' (reset).
export { state, sync } from './core/state/index.js';
export { storage } from './core/storage/index.js';
export { events } from './core/events/index.js';
export { view } from './core/ui/index.js';
export { cache, reset } from './core/router/index.js';
