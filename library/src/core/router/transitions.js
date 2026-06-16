/**
 * src/core/router/transitions.js
 *
 * Safe wrapper for the browser's CSS View Transitions API.
 * Animates page updates off-thread via GPU screenshots when available,
 * falling back instantly to standard synchronous rendering when unsupported
 * or when the user prefers reduced motion.
 *
 * Injects a token-aware stylesheet on first run so VT timing and backdrop
 * derive from the semantic token layer.
 *
 * Source: doc 09 — Routing §8, plan.md §5
 */

let injected = false;

function injectSheet() {
  if (injected || typeof document === 'undefined') return;
  injected = true;

  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(`
      /* Dock-swap group: element-scoped content transitions */
      ::view-transition-group(dock-swap) {
        animation-duration: var(--transition-duration);
        animation-timing-function: var(--transition-easing);
      }
      ::view-transition-old(dock-swap),
      ::view-transition-new(dock-swap) {
        animation-duration: var(--transition-duration);
        animation-timing-function: var(--transition-easing);
        background: var(--transition-bg);
      }
    `);
    document.adoptedStyleSheets.push(sheet);
  } catch (_) {}
}

export const transitions = {
  /**
   * Wraps a DOM modification callback in a view transition.
   * Skips the transition when the user prefers reduced motion.
   * Supports transient shared element morphing.
   */
  async run(updateDOM, options = {}) {
    const { sourceElement, name = 'selected-item' } = options;

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (
      !reduced &&
      typeof document !== 'undefined' &&
      typeof document.startViewTransition === 'function'
    ) {
      injectSheet();

      const hasSource = sourceElement && sourceElement instanceof HTMLElement;
      if (hasSource) {
        sourceElement.style.viewTransitionName = name;
      }

      const tx = document.startViewTransition(() => {
        const res = updateDOM();
        if (res instanceof Promise) return res;
      });

      if (hasSource) {
        tx.finished.finally(() => {
          sourceElement.style.viewTransitionName = '';
        });
      }

      try {
        await tx.finished;
      } catch (err) {
        // Silence aborted or superseded transition errors to preserve router stability
        console.warn('View Transition was aborted or failed:', err);
      }
    } else {
      const res = updateDOM();
      if (res instanceof Promise) await res;
    }
  }
};
