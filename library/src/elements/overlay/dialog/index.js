/**
 * src/elements/overlay/dialog/index.js
 *
 * Overlay System: <ui-dialog>
 * Premium dialog overlay wrapping native browser <dialog> for zero-cost
 * focus traps, light backdrops, Escape dismissals, and modal lifecycles.
 *
 * Source: doc 04 — Web Components §3, doc 05 — Native UI Primitives §5
 */

import { ui } from '../../../core/ui/index.js';

ui.element('ui-dialog', {
  style: './style.css',
  template: './index.html',
  props: {
    open: { type: Boolean, reflect: true }
  },
  mount({ el, tags, on }) {
    const dialog = tags.one('dialog');

    // Sync close and cancel events from native dialog
    on.close(dialog, () => {
      el.open = false;
      el.dispatchEvent(new CustomEvent('close', {
        detail: { returnValue: dialog.returnValue },
        bubbles: true,
        composed: true
      }));
    });

    on.cancel(dialog, (e) => {
      const cancelEvent = new CustomEvent('cancel', {
        bubbles: true,
        composed: true,
        cancelable: true
      });
      el.dispatchEvent(cancelEvent);
      if (cancelEvent.defaultPrevented) {
        e.preventDefault();
      }
    });
  },
  // Methods run with `this` bound to the element (not a context object).
  methods: {
    showModal() {
      const dialog = this.shadowRoot?.querySelector('dialog');
      if (!dialog) return;
      if (!dialog.open) dialog.showModal();
      this.open = true;
      this.dispatchEvent(new CustomEvent('show', { bubbles: true, composed: true }));
    },
    close(returnValue = '') {
      const dialog = this.shadowRoot?.querySelector('dialog');
      if (dialog?.open) dialog.close(returnValue);
      this.open = false;
    }
  }
}, import.meta.url);
