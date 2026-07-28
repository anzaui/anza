/**
 * core/platform/index.js
 *
 * Public platform module entry.
 * Re-exports supports detection registry and the lazy-load guard,
 * while eagerly bootstrapping necessary global environment polyfills.
 * Source: doc 18 §12, library2.md §Phase 1-A
 */

import { supports, reset, typeGuard } from './supports.js';
import guard from './guard.js';

// Bootstrapping of critical global environment gaps
if (typeof window !== 'undefined') {
  if (!supports.declarativeShadowDOM) {
    import('./polyfills/shadow.js').catch(err => {
      console.error('Failed to eagerly bootstrap shadow polyfill:', err);
    });
  }
  if (!supports.popoverAPI) {
    import('./polyfills/popover.js').catch(err => {
      console.error('Failed to eagerly bootstrap popover polyfill:', err);
    });
  }
  if (!supports.urlPattern) {
    import('./polyfills/urlpattern.js').catch(err => {
      console.error('Failed to eagerly bootstrap URLPattern polyfill:', err);
    });
  }
  if (!supports.navigationAPI) {
    import('./polyfills/navigation.js').catch(err => {
      console.error('Failed to eagerly bootstrap Navigation polyfill:', err);
    });
  }
  if (!supports.schedulerPostTask) {
    import('./polyfills/scheduler.js').catch(err => {
      console.error('Failed to eagerly bootstrap Scheduler polyfill:', err);
    });
  }
}

export { supports, reset, typeGuard, guard };
export { escapeOverflow } from './escape.js';
export { globals, attach, detach, count, list, clear as clearGlobals } from './globals.js';

