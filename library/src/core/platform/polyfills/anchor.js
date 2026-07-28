/**
 * core/platform/polyfills/anchor.js
 *
 * Lightweight CSS Anchor Positioning positional fallback.
 * Computes optimal top/left coordinates based on placement rules and viewport collisions.
 * Supports `mode: 'absolute'` (document coords) and `mode: 'fixed'` (viewport coords).
 * Source: doc 18 §12, library2.md §Phase 1-A
 */

/**
 * @param {HTMLElement} floating
 * @param {HTMLElement} anchor
 * @param {{
 *   placement?: string,
 *   offset?: number,
 *   mode?: 'absolute' | 'fixed'
 * }} [options]
 */
export function position(floating, anchor, options = {}) {
  if (!floating || !anchor) return;

  const placement = options.placement || 'bottom-start';
  const offset = options.offset ?? 8;
  const mode = options.mode === 'fixed' ? 'fixed' : 'absolute';

  const anchorRect = anchor.getBoundingClientRect();
  const floatRect = floating.getBoundingClientRect();

  const scrollY = mode === 'fixed' ? 0 : (globalThis.scrollY || globalThis.pageYOffset || 0);
  const scrollX = mode === 'fixed' ? 0 : (globalThis.scrollX || globalThis.pageXOffset || 0);

  const anchorTop = anchorRect.top + scrollY;
  const anchorLeft = anchorRect.left + scrollX;
  const anchorCenterX = anchorLeft + anchorRect.width / 2;
  const anchorCenterY = anchorTop + anchorRect.height / 2;

  let top = 0;
  let left = 0;

  switch (placement) {
    case 'bottom':
      top = anchorTop + anchorRect.height + offset;
      left = anchorCenterX - floatRect.width / 2;
      break;
    case 'bottom-start':
      top = anchorTop + anchorRect.height + offset;
      left = anchorLeft;
      break;
    case 'bottom-end':
      top = anchorTop + anchorRect.height + offset;
      left = anchorLeft + anchorRect.width - floatRect.width;
      break;
    case 'top':
      top = anchorTop - floatRect.height - offset;
      left = anchorCenterX - floatRect.width / 2;
      break;
    case 'top-start':
      top = anchorTop - floatRect.height - offset;
      left = anchorLeft;
      break;
    case 'top-end':
      top = anchorTop - floatRect.height - offset;
      left = anchorLeft + anchorRect.width - floatRect.width;
      break;
    case 'right':
      top = anchorCenterY - floatRect.height / 2;
      left = anchorLeft + anchorRect.width + offset;
      break;
    case 'right-start':
      top = anchorTop;
      left = anchorLeft + anchorRect.width + offset;
      break;
    case 'left':
      top = anchorCenterY - floatRect.height / 2;
      left = anchorLeft - floatRect.width - offset;
      break;
    case 'left-start':
      top = anchorTop;
      left = anchorLeft - floatRect.width - offset;
      break;
    default:
      top = anchorTop + anchorRect.height + offset;
      left = anchorLeft;
  }

  // Viewport containment checking
  const viewportWidth = globalThis.innerWidth || 0;
  const viewportHeight = globalThis.innerHeight || 0;
  const viewLeft = scrollX;
  const viewTop = scrollY;

  if (left < viewLeft) {
    left = viewLeft;
  }
  if (left + floatRect.width > viewLeft + viewportWidth) {
    left = Math.max(viewLeft, viewLeft + viewportWidth - floatRect.width);
  }
  if (top < viewTop) {
    top = viewTop;
  }
  if (top + floatRect.height > viewTop + viewportHeight) {
    top = Math.max(viewTop, viewTop + viewportHeight - floatRect.height);
  }

  floating.style.position = mode;
  floating.style.top = `${top}px`;
  floating.style.left = `${left}px`;
  floating.style.right = 'auto';
  floating.style.bottom = 'auto';
  floating.style.margin = '0';
}

export default { position };
