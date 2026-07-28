/**
 * src/core/router/transitions.js
 *
 * Router-facing View Transitions helper.
 * Delegates to the UI transition core so document morphs and dock swaps share
 * reduced-motion, AbortSignal, naming, and fallback behaviour.
 *
 * Injects a token-aware stylesheet on first document-level run so VT timing
 * and backdrop derive from the semantic token layer.
 *
 * Source: doc 09 — Routing §8, plan.md §5
 */

import {
  transition,
  prefersReducedMotion,
  configureTransitions,
  getTransitionConfig,
  runSwapTransition,
  dockTransitionName
} from '../ui/transitions.js';

let injected = false;

function injectSheet() {
  if (injected || typeof document === 'undefined') return;
  injected = true;

  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(`
      /* Named dock groups — keep (root) chrome stable; style leaf docks */
      ::view-transition-group(dock-swap),
      ::view-transition-group(dock-main),
      ::view-transition-group(dock-docs),
      ::view-transition-group(dock-content) {
        animation-duration: var(--transition-duration);
        animation-timing-function: var(--transition-easing);
      }
      ::view-transition-old(dock-swap),
      ::view-transition-new(dock-swap),
      ::view-transition-old(dock-main),
      ::view-transition-new(dock-main),
      ::view-transition-old(dock-docs),
      ::view-transition-new(dock-docs),
      ::view-transition-old(dock-content),
      ::view-transition-new(dock-content) {
        animation-duration: var(--transition-duration);
        animation-timing-function: var(--transition-easing);
        background: var(--transition-bg);
      }
    `);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  } catch (_) {}
}

export const transitions = {
  configure: configureTransitions,
  getConfig: getTransitionConfig,
  prefersReducedMotion,
  dockName: dockTransitionName,
  runSwap: runSwapTransition,

  /**
   * Wraps a DOM modification callback in a document view transition.
   * Skips when unsupported, reduced-motion, disabled, or aborted.
   * Supports transient shared-element morphing via sourceElement/name.
   *
   * @param {() => (void|Promise<void>)} updateDOM
   * @param {object} [options]
   * @param {Element} [options.sourceElement]
   * @param {string} [options.name='selected-item']
   * @param {AbortSignal} [options.signal]
   * @param {boolean} [options.skip]
   * @param {boolean} [options.enabled]
   * @param {string} [options.direction]
   */
  async run(updateDOM, options = {}) {
    const {
      sourceElement,
      name = 'selected-item',
      signal,
      skip,
      enabled,
      direction
    } = options;

    if (
      !skip
      && enabled !== false
      && !prefersReducedMotion()
      && typeof document !== 'undefined'
      && typeof document.startViewTransition === 'function'
    ) {
      injectSheet();
    }

    try {
      await transition(updateDOM, {
        scope: 'document',
        sourceElement,
        sourceName: name,
        signal,
        skip,
        enabled,
        direction
      });
    } catch (err) {
      if (err?.name === 'AbortError') return;
      // transition() already falls back on VT failure; silence residual noise
      console.warn('View Transition was aborted or failed:', err);
    }
  }
};
