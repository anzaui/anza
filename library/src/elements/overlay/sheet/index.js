/**
 * src/elements/overlay/sheet/index.js
 *
 * Overlay System: <ui-sheet>
 * Bottom Sheet container rendering in the top-layer backed by native <dialog>,
 * and implementing highly interactive pointer-driven drag-to-dismiss gesture controls.
 *
 * Source: doc 04 — Web Components §3, doc 05 — Native UI Primitives §5
 */

import { ui } from '../../../core/ui/index.js';

ui.element('ui-sheet', {
  style: './style.css',
  template: './index.html',
  props: {
    open: { type: Boolean, reflect: true }
  },
  mount({ el, tags, on }) {
    const dialog = tags.one('dialog');
    const handle = tags.one('.handle-bar');

    on.close(dialog, () => {
      el.open = false;
      el.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    });

    // Pointer event bindings for drag gesture handling
    on.pointerdown(handle, (e) => {
      e.preventDefault();
      el.dataset.startY = e.clientY;
      el.dataset.dragging = 'true';
      dialog.style.transition = 'none';
      handle.style.cursor = 'grabbing';
    });

    on.pointermove(dialog, (e) => {
      if (el.dataset.dragging !== 'true') return;
      const deltaY = e.clientY - parseInt(el.dataset.startY || '0', 10);

      // Only allow dragging downwards (positive delta Y)
      if (deltaY > 0) {
        dialog.style.transform = `translateY(${deltaY}px)`;
        el.dataset.currentY = deltaY;
      }
    });

    on.pointerup(dialog, () => {
      if (el.dataset.dragging !== 'true') return;
      el.dataset.dragging = 'false';

      dialog.style.transition = '';
      handle.style.cursor = 'grab';

      // If dragged Y exceeds 120px threshold, dismiss the sheet. Else restore position.
      const currentY = parseInt(el.dataset.currentY || '0', 10);
      if (currentY > 120) {
        hide(el, tags);
      } else {
        dialog.style.transform = '';
      }

      el.dataset.currentY = '0';
    });

    on.pointercancel(dialog, () => {
      if (el.dataset.dragging !== 'true') return;
      el.dataset.dragging = 'false';
      dialog.style.transition = '';
      handle.style.cursor = 'grab';
      dialog.style.transform = '';
      el.dataset.currentY = '0';
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
    requestAnimationFrame(() => dialog.classList.add('open'));
  } else if (!open && dialog.open) {
    dialog.classList.remove('open');
    setTimeout(() => dialog.close(), 300);
  }
}

function hide(el, tags) {
  el.open = false;
}
