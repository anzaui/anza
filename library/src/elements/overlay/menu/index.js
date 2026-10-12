/**
 * src/elements/overlay/menu/index.js
 *
 * Overlay System: <ui-menu>
 * Anchor-able popover menu container implementing roving tabindex,
 * full keyboard menu navigation (arrows, Home, End), and WAI-ARIA role="menu" specifications.
 *
 * Source: doc 04 — Web Components §3, doc 05 — Native UI Primitives §5
 */

import { ui } from '../../../core/ui/index.js';
import { guard } from '../../../core/platform/index.js';

ui.element('ui-menu', {
  style: './style.css',
  template: './index.html',
  mount({ el, tags, on }) {
    // Load the Popover API polyfill where the platform lacks it.
    guard.popover().catch(() => {});

    const popover = tags.one('[popover]');
    const slot = tags.one('slot');

    on.slotchange(slot, () => {
      const items = getItems(tags);
      items.forEach((item, index) => {
        if (!item.hasAttribute('role')) {
          item.setAttribute('role', 'menuitem');
        }
        item.setAttribute('tabindex', index === 0 ? '0' : '-1');
      });
    });

    on.keydown(popover, (e) => {
      const items = getItems(tags);
      if (items.length === 0) return;

      const focusedIndex = parseInt(el.dataset.focusedIndex || '0', 10);

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          focusItem(el, tags, focusedIndex + 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          focusItem(el, tags, focusedIndex - 1);
          break;
        case 'Home':
          e.preventDefault();
          focusItem(el, tags, 0);
          break;
        case 'End':
          e.preventDefault();
          focusItem(el, tags, items.length - 1);
          break;
        case 'Escape':
          e.preventDefault();
          hide(el, tags);
          break;
      }
    });
  },
  // Methods run with `this` bound to the element (not a context object).
  methods: {
    show() {
      const tags = this._tags;
      const popover = tags?.one('[popover]');
      if (!popover) return;
      if (!isOpen(popover)) popover.showPopover();
      focusItem(this, tags, 0);
    },
    hide() {
      const popover = this._tags?.one('[popover]');
      if (popover && isOpen(popover)) popover.hidePopover();
    },
    toggle() {
      const popover = this._tags?.one('[popover]');
      if (!popover) return;
      if (isOpen(popover)) {
        this.hide();
      } else {
        this.show();
      }
    }
  }
}, import.meta.url);

function getItems(tags) {
  const slot = tags.one('slot');
  return slot.assignedElements().filter((el) => {
    const tag = el.tagName.toLowerCase();
    return tag === 'ui-button' || tag === 'button' || el.getAttribute('role') === 'menuitem';
  });
}

function focusItem(el, tags, index) {
  const items = getItems(tags);
  if (items.length === 0) return;

  // Boundary wrap protection
  const focusedIndex = (index + items.length) % items.length;
  el.dataset.focusedIndex = focusedIndex;

  items.forEach((item, idx) => {
    if (idx === focusedIndex) {
      item.setAttribute('tabindex', '0');
      item.focus();
    } else {
      item.setAttribute('tabindex', '-1');
    }
  });
}

function hide(el, tags) {
  tags.one('[popover]').hidePopover();
}

/** Popover open state, native (:popover-open) or polyfilled (data-popover-open). */
function isOpen(popover) {
  try {
    return popover.matches(':popover-open');
  } catch {
    return popover.hasAttribute('data-popover-open');
  }
}
