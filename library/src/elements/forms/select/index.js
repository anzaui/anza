/**
 * src/elements/forms/select/index.js
 *
 * Form Control: <ui-select>
 * Form-participating dropdown selector utilizing the native Popover API
 * and Anchor Positioning for premium overlay layout.
 *
 * Source: doc 04 — Web Components §9, doc 05 — Native UI Primitives §3
 */

import { ui } from '../../../core/ui/index.js';

/** `value` attribute at first mount: what a form reset restores. */
const defaults = new WeakMap();

ui.element('ui-select', {
  style: './style.css',
  template: './index.html',
  form: true,
  props: {
    value: { type: String, reflect: true },
    placeholder: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true, state: true },
    required: { type: Boolean, reflect: true }
  },
  mount({ el, internals, tags, on, ctrl }) {
    const slot = tags.one('slot');
    const trigger = tags.one('#trigger');
    const popover = tags.one('#dropdown');
    if (!defaults.has(el)) defaults.set(el, el.getAttribute('value') ?? '');

    on.slotchange(slot, () => syncValue(el, tags, internals));

    // Options are light-DOM children, outside the shadow root `on` covers:
    // listen on the host and find the clicked option.
    el.addEventListener('click', (e) => {
      if (el.disabled) return;
      const options = slot.assignedElements();
      const option = e.composedPath().find((node) => options.includes(node));
      if (!option) return;
      const val = option.getAttribute('value') || option.textContent.trim();
      if (popover.matches(':popover-open')) popover.hidePopover();
      if (val === el.value) return;
      el.value = val;
      syncValue(el, tags, internals);
      el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }, { signal: ctrl.signal });

    // Anchor positioning polyfill fallback where needed
    if (!('anchorName' in document.documentElement.style)) {
      on.toggle(popover, (e) => {
        if (e.newState === 'open') {
          const rect = trigger.getBoundingClientRect();
          popover.style.top = `${rect.bottom + window.scrollY}px`;
          popover.style.left = `${rect.left + window.scrollX}px`;
          popover.style.width = `${rect.width}px`;
        }
      });
    }

    syncAttributes(el, tags, internals);
  },
  update({ el, name, tags, internals }) {
    if (name === 'disabled' || name === 'value' || name === 'placeholder' || name === 'required') {
      syncAttributes(el, tags, internals);
    }
  },
  // Form-associated hooks run with `this` bound to the element.
  reset() {
    this.value = defaults.get(this) ?? '';
    if (this._ctx) syncAttributes(this, this._tags, this._ctx.internals);
  },
  disabled(disabled) {
    const trigger = this._tags?.one('#trigger');
    if (trigger) trigger.disabled = disabled || this.disabled;
  },
  restore(state) {
    if (typeof state === 'string') this.value = state;
  }
}, import.meta.url);

function syncAttributes(el, tags, internals) {
  const trigger = tags.one('#trigger');
  const disabled = el.disabled;

  trigger.disabled = disabled;

  syncValue(el, tags, internals);
}

function syncValue(el, tags, internals) {
  const slot = tags.one('slot');
  const nodes = slot.assignedElements();
  const val = el.value;
  const label = tags.one('#selected-label');

  let selectedNode = null;
  for (const node of nodes) {
    const nodeVal = node.getAttribute('value') || node.textContent.trim();
    if (nodeVal === val) {
      node.setAttribute('selected', '');
      selectedNode = node;
    } else {
      node.removeAttribute('selected');
    }
  }

  if (selectedNode) {
    label.textContent = selectedNode.textContent.trim();
  } else {
    label.textContent = el.placeholder || 'Select option...';
  }

  internals.setFormValue(val || '');
  validate(el, internals);
}

function validate(el, internals) {
  const val = el.value;
  if (el.required && !val) {
    internals.setValidity({ valueMissing: true }, 'Please select an option.');
  } else {
    internals.setValidity({});
  }
}
