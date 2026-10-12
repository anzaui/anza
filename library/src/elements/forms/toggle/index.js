/**
 * src/elements/forms/toggle/index.js
 *
 * Form Control: <ui-toggle>
 * Form-participating Switch toggle element. Features standard switch ARIA roles,
 * custom :state(on) pseudo-classes, and beautiful slide animations.
 *
 * Source: doc 04 — Web Components §9, doc 05 — Native UI Primitives §3
 */

import { ui } from '../../../core/ui/index.js';

/** `checked` attribute at first mount: what a form reset restores. */
const defaults = new WeakMap();

ui.element('ui-toggle', {
  style: './style.css',
  template: './index.html',
  form: true,
  props: {
    checked: { type: Boolean, reflect: true, state: 'on' },
    disabled: { type: Boolean, reflect: true, state: true },
    value: { type: String, reflect: true }
  },
  mount({ el, internals, ctrl }) {
    if (!defaults.has(el)) defaults.set(el, el.hasAttribute('checked'));

    if (!el.hasAttribute('tabindex')) {
      el.setAttribute('tabindex', '0');
    }
    if (!el.hasAttribute('role')) {
      el.setAttribute('role', 'switch');
    }

    // User toggle: sync the form value before `change`.
    const flip = () => {
      el.checked = !el.checked;
      syncAttributes(el, internals);
      el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    };

    // The host is outside the shadow root, so `on` cannot bind it.
    el.addEventListener('click', (e) => {
      if (el.disabled) return;
      e.preventDefault();
      flip();
    }, { signal: ctrl.signal });

    el.addEventListener('keydown', (e) => {
      if (el.disabled) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        flip();
      }
    }, { signal: ctrl.signal });

    syncAttributes(el, internals);
  },
  update({ el, name, val, internals }) {
    if (name === 'checked' || name === 'disabled') {
      syncAttributes(el, internals);
    }
  },
  // Form-associated hooks run with `this` bound to the element.
  reset() {
    this.checked = defaults.get(this) ?? false;
    if (this._ctx) syncAttributes(this, this._ctx.internals);
  },
  disabled(disabled) {
    if (disabled) {
      this.removeAttribute('tabindex');
    } else if (!this.disabled && !this.hasAttribute('tabindex')) {
      this.setAttribute('tabindex', '0');
    }
  },
  restore(state) {
    this.checked = state != null;
  }
}, import.meta.url);

function syncAttributes(el, internals) {
  const checked = el.checked;
  const disabled = el.disabled;

  if (checked) {
    internals.states.add('on');
    el.setAttribute('aria-checked', 'true');
  } else {
    internals.states.delete('on');
    el.setAttribute('aria-checked', 'false');
  }

  if (disabled) {
    internals.states.add('disabled');
    el.removeAttribute('tabindex');
  } else {
    internals.states.delete('disabled');
    if (!el.hasAttribute('tabindex')) {
      el.setAttribute('tabindex', '0');
    }
  }

  const subValue = checked ? (el.value || 'on') : null;
  internals.setFormValue(subValue);
}
