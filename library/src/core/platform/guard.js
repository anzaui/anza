/**
 * core/platform/guard.js
 *
 * Feature-gate wrapper and lazy polyfill loader.
 * Ensures caller experiences uniform APIs regardless of native vs polyfill support.
 * Source: doc 18 §12, library2.md §Phase 1-A
 */

import { supports } from './supports.js';

export async function urlPattern() {
  if (supports.urlPattern) {
    return globalThis.URLPattern;
  }
  const { default: polyfill } = await import('./polyfills/urlpattern.js');
  return polyfill;
}

export async function navigation() {
  if (supports.navigationAPI) {
    return globalThis.navigation;
  }
  await import('./polyfills/navigation.js');
  return globalThis.navigation;
}

export async function popover() {
  if (supports.popoverAPI) return;
  await import('./polyfills/popover.js');
}

export async function shadow(root = document) {
  if (supports.declarativeShadowDOM) return;
  const { apply } = await import('./polyfills/shadow.js');
  apply(root);
}

export async function anchor(floating, anchorEl, options = {}) {
  if (supports.anchorPositioning && options.mode !== 'fixed') {
    // Native CSS Anchor positioning handles this; no script action needed.
    return;
  }
  const { position } = await import('./polyfills/anchor.js');
  position(floating, anchorEl, options);
}

/**
 * Position a floating element so it escapes overflow clipping.
 * Ensures Popover API (native or polyfill) when the floating node is a popover.
 * @returns {Promise<import('./escape.js').EscapeController>}
 */
export async function escape(floating, anchorEl, options = {}) {
  if (floating?.hasAttribute?.('popover')) {
    await popover();
  }
  const { escapeOverflow } = await import('./escape.js');
  return escapeOverflow(floating, anchorEl, options);
}

export async function sanitizer() {
  if (supports.sanitizerAPI && typeof globalThis.Sanitizer === 'function') {
    try {
      const s = new globalThis.Sanitizer();
      if (typeof s.sanitize === 'function') {
        return {
          sanitizeToString(input) {
            const temp = document.createElement('div');
            temp.innerHTML = input;
            const fragment = s.sanitize(temp);
            const wrapper = document.createElement('div');
            wrapper.appendChild(fragment);
            return wrapper.innerHTML;
          }
        };
      }
    } catch {
      // Fallback if construction fails
    }
  }
  // Lightweight DOMPurify / Sanitizer standard fallback
  return {
    sanitizeToString(input) {
      if (typeof DOMPurify !== 'undefined') {
        return DOMPurify.sanitize(input);
      }
      // Fail-safe simple string sanitizer
      const temp = document.createElement('div');
      temp.textContent = input;
      return temp.innerHTML;
    }
  };
}

export async function scheduler() {
  if (supports.schedulerPostTask) {
    return globalThis.scheduler;
  }
  await import('./polyfills/scheduler.js');
  return globalThis.scheduler;
}

export async function yieldTask() {
  const s = await scheduler();
  return s.yield();
}

export default {
  urlPattern,
  navigation,
  popover,
  shadow,
  anchor,
  escape,
  sanitizer,
  scheduler,
  yield: yieldTask
};

