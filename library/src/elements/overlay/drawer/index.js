/**
 * src/elements/overlay/drawer/index.js
 *
 * Overlay System: <ui-drawer>
 * side layout panel utilizing native <dialog> focus trapping features
 * and beautiful off-thread slide transition capabilities.
 *
 * Source: doc 04 — Web Components §3, doc 05 — Native UI Primitives §5
 */

import { ui } from '../../../core/ui/index.js';

ui.element('ui-drawer', {
  style: './style.css',
  template: './index.html',
  props: {
    open: { type: Boolean, reflect: true },
    placement: { type: String, reflect: true, default: 'right' }
  },
  mount({ el, tags, on }) {
    const dialog = tags.one('dialog');

    on.close(dialog, () => {
      el.open = false;
      el.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    });

    syncAttributes(el, tags);
  },
  update({ el, tags }) {
    syncAttributes(el, tags);
  },
  // Methods run with `this` bound to the element (not a context object).
  methods: {
    show() {
      this.open = true;
    },
    hide() {
      this.open = false;
    }
  }
}, import.meta.url);

function syncAttributes(el, tags) {
  const dialog = tags.one('dialog');
  const open = el.open;

  if (open && !dialog.open) {
    dialog.showModal();
    // Delay class toggle by a microtask to fire slide transitions
    requestAnimationFrame(() => dialog.classList.add('open'));
  } else if (!open && dialog.open) {
    dialog.classList.remove('open');
    // Wait for transform transitions to complete before closing modal
    setTimeout(() => dialog.close(), 300);
  }
}
