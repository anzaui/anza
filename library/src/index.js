/**
 * src/index.js
 *
 * Root entry of @anzaui/anza: a flat re-export of the core modules.
 * Theme, elements and the service worker helpers are separate subpaths.
 * A name exported by two modules (state, storage, sync, events, cache, view,
 * reset) is dropped here by the ES spec; import it from its subpath.
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
