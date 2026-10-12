/**
 * src/elements/overlay/popover/index.js
 *
 * Overlay System: <ui-popover>
 * Lightweight contextual overlay container utilizing the native Popover API
 * for top-layer rendering and automatic light dismiss.
 *
 * Source: doc 04 — Web Components §3, doc 05 — Native UI Primitives §5
 */

import { ui } from '../../../core/ui/index.js';
import { guard } from '../../../core/platform/index.js';

ui.element('ui-popover', {
  style: './style.css',
  template: './index.html',
  mount({ el, tags, on }) {
    // Load the Popover API polyfill where the platform lacks it.
    guard.popover().catch(() => {});

    const popover = tags.one('[popover]');

    // Expose toggle events to parent elements
    on.toggle(popover, (e) => {
      el.dispatchEvent(new CustomEvent('toggle', {
        detail: { newState: e.newState },
        bubbles: true,
        composed: true
      }));
    });
  },
  // Methods run with `this` bound to the element (not a context object).
  methods: {
    show() {
      const popover = this._tags?.one('[popover]');
      if (popover && !isOpen(popover)) popover.showPopover();
    },
    hide() {
      const popover = this._tags?.one('[popover]');
      if (popover && isOpen(popover)) popover.hidePopover();
    },
    toggle() {
      const popover = this._tags?.one('[popover]');
      if (!popover) return;
      if (isOpen(popover)) {
        popover.hidePopover();
      } else {
        popover.showPopover();
      }
    }
  }
}, import.meta.url);

/** Popover open state, native (:popover-open) or polyfilled (data-popover-open). */
function isOpen(popover) {
  try {
    return popover.matches(':popover-open');
  } catch {
    return popover.hasAttribute('data-popover-open');
  }
}
