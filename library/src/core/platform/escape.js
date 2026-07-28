/**
 * core/platform/escape.js
 *
 * Positioning / overflow-escape helper for floating UI (tooltips, etc.).
 * Prefers Popover API top-layer when available (native or polyfilled), then
 * falls back to viewport-fixed coordinates so overflow:hidden ancestors do
 * not clip the floating surface. CSS Anchor Positioning is used when present;
 * otherwise JS placement via the anchor polyfill (`mode: 'fixed'`).
 *
 * Not a body portal — the floating node stays in-tree (typically in shadow).
 */

import { supports } from './supports.js';
import { position } from './polyfills/anchor.js';

/**
 * @typedef {{
 *   placement?: string,
 *   offset?: number,
 *   signal?: AbortSignal,
 *   cssAnchor?: boolean,
 *   strategy?: 'popover' | 'fixed'
 * }} EscapeOptions
 */

/**
 * @typedef {{
 *   show: () => void,
 *   hide: () => void,
 *   update: () => void,
 *   release: () => void,
 *   strategy: 'popover' | 'fixed',
 *   open: boolean
 * }} EscapeController
 */

function canUsePopover(floating) {
  return Boolean(
    floating
    && typeof floating.showPopover === 'function'
    && typeof floating.hidePopover === 'function'
    && floating.hasAttribute('popover')
  );
}

function clearInlinePosition(floating) {
  floating.style.top = '';
  floating.style.left = '';
  floating.style.right = '';
  floating.style.bottom = '';
  floating.style.margin = '';
  if (floating.dataset.escapeFixed != null) {
    floating.style.position = '';
    floating.style.zIndex = '';
    delete floating.dataset.escapeFixed;
  }
}

/**
 * Create a show/hide/update controller that positions `floating` relative to
 * `anchor` and escapes overflow clipping when possible.
 *
 * @param {HTMLElement} floating
 * @param {HTMLElement} anchor
 * @param {EscapeOptions} [options]
 * @returns {EscapeController}
 */
export function escapeOverflow(floating, anchor, options = {}) {
  if (!floating || !anchor) {
    return {
      show() {},
      hide() {},
      update() {},
      release() {},
      strategy: 'fixed',
      open: false
    };
  }

  const placement = options.placement || 'top';
  const offset = options.offset ?? 8;
  const preferCssAnchor = options.cssAnchor !== false && supports.anchorPositioning;

  let strategy = options.strategy
    || (canUsePopover(floating) ? 'popover' : 'fixed');
  if (strategy === 'popover' && !canUsePopover(floating)) {
    strategy = 'fixed';
  }

  let open = false;
  let scrollHandler = null;

  function applyPosition() {
    if (!open) return;
    // Native CSS Anchor Positioning: leave placement to author styles when opted in.
    if (preferCssAnchor && strategy === 'popover' && options.cssAnchor === true) {
      return;
    }
    position(floating, anchor, { placement, offset, mode: 'fixed' });
    if (strategy === 'fixed') {
      floating.dataset.escapeFixed = '';
      if (!floating.style.zIndex) {
        floating.style.zIndex = '1000';
      }
    }
  }

  function onScrollOrResize() {
    applyPosition();
  }

  function attachReposition() {
    if (scrollHandler) return;
    scrollHandler = onScrollOrResize;
    globalThis.addEventListener('scroll', scrollHandler, true);
    globalThis.addEventListener('resize', scrollHandler);
  }

  function detachReposition() {
    if (!scrollHandler) return;
    globalThis.removeEventListener('scroll', scrollHandler, true);
    globalThis.removeEventListener('resize', scrollHandler);
    scrollHandler = null;
  }

  function show() {
    if (options.signal?.aborted) return;
    open = true;

    if (strategy === 'popover') {
      try {
        floating.showPopover();
      } catch {
        strategy = 'fixed';
      }
    }

    if (strategy === 'fixed') {
      floating.style.position = 'fixed';
      floating.style.zIndex = floating.style.zIndex || '1000';
      floating.dataset.escapeFixed = '';
      floating.dataset.escapeOpen = '';
    }

    // Measure after open so floatRect is non-zero (popover display:none → visible).
    applyPosition();
    // Second pass after layout settles (width/height may change once visible).
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        if (open) applyPosition();
      });
    }

    attachReposition();
  }

  function hide() {
    open = false;
    detachReposition();

    if (strategy === 'popover' && typeof floating.hidePopover === 'function') {
      try {
        floating.hidePopover();
      } catch {
        // ignore
      }
    }

    delete floating.dataset.escapeOpen;
    clearInlinePosition(floating);
  }

  function update() {
    applyPosition();
  }

  function release() {
    hide();
  }

  if (options.signal) {
    options.signal.addEventListener('abort', () => release(), { once: true });
  }

  return {
    show,
    hide,
    update,
    release,
    get strategy() {
      return strategy;
    },
    get open() {
      return open;
    }
  };
}

export default { escapeOverflow };
