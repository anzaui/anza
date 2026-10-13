/**
 * src/elements/overlay/dialog/index.js
 *
 * Overlay System: <ui-dialog>
 * Premium dialog overlay wrapping native browser <dialog> for zero-cost
 * focus traps, light backdrops, Escape dismissals, and modal lifecycles.
 *
 * The `open` prop (and attribute) drives the native dialog: true opens it
 * as a modal, false closes it. showModal()/close() and native closes keep
 * the prop in sync.
 *
 * Source: doc 04 — Web Components §3, doc 05 — Native UI Primitives §5
 */

import { ui } from '../../../core/ui/index.js';

/** Last `open` value applied to each host's native dialog. */
const applied = new WeakMap();

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
      applied.set(el, false);
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

    // `open` in the markup (or set before mount) opens the modal now.
    applied.set(el, dialog.open);
    sync(el, dialog);
  },
  update({ el, name, tags }) {
    if (name === 'open') sync(el, tags.one('dialog'));
  },
  // Methods run with `this` bound to the element (not a context object).
  methods: {
    showModal() {
      this.open = true;
      // Open synchronously when mounted, like HTMLDialogElement.showModal().
      const dialog = this._tags?.one('dialog');
      if (dialog) sync(this, dialog);
    },
    close(returnValue = '') {
      const dialog = this._tags?.one('dialog');
      if (dialog?.open) dialog.close(returnValue);
      this.open = false;
    }
  }
}, import.meta.url);

/**
 * Makes the native dialog match `el.open`. Acts only when `open` changed
 * since it was last applied, so a batched update that runs after a native
 * close (or after showModal() already opened it) does not undo it.
 */
function sync(el, dialog) {
  if (!dialog) return;
  const want = Boolean(el.open);
  if (applied.get(el) === want) return;
  if (want && !el.isConnected) return;
  applied.set(el, want);
  if (want && !dialog.open) {
    dialog.showModal();
    el.dispatchEvent(new CustomEvent('show', { bubbles: true, composed: true }));
  } else if (!el.open && dialog.open) {
    dialog.close();
  }
}
