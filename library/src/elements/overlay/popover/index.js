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

ui.element('ui-popover', {
  style: './style.css',
  template: './index.html',
  mount({ el, tags, on }) {
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
      if (popover && !popover.matches(':popover-open')) popover.showPopover();
    },
    hide() {
      const popover = this._tags?.one('[popover]');
      if (popover?.matches(':popover-open')) popover.hidePopover();
    },
    toggle() {
      const popover = this._tags?.one('[popover]');
      if (!popover) return;
      if (popover.matches(':popover-open')) {
        popover.hidePopover();
      } else {
        popover.showPopover();
      }
    }
  }
}, import.meta.url);
