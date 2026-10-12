/**
 * src/elements/forms/input/index.js
 *
 * Form Control: <ui-input>
 * Form-participating text/number/email/password input control using ElementInternals
 * for seamless integration with native form submission and validation.
 *
 * Source: doc 04 — Web Components §9, doc 05 — Native UI Primitives §3
 */

import { ui } from '../../../core/ui/index.js';

/** Value attribute at first mount: what a form reset restores. */
const defaults = new WeakMap();

const ATTRS = ['type', 'placeholder', 'required', 'minlength', 'maxlength', 'min', 'max', 'pattern'];

ui.element('ui-input', {
  style: './style.css',
  template: './index.html',
  form: true,
  props: {
    type: { type: String, reflect: true, default: 'text' },
    value: { type: String, reflect: true },
    placeholder: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true, state: true },
    required: { type: Boolean, reflect: true },
    minlength: { type: Number, reflect: true },
    maxlength: { type: Number, reflect: true },
    min: { type: Number, reflect: true },
    max: { type: Number, reflect: true },
    pattern: { type: String, reflect: true }
  },
  mount({ el, internals, tags, on }) {
    const input = tags.one('input');
    if (!defaults.has(el)) defaults.set(el, el.getAttribute('value') ?? '');

    // Bind change and input event listeners
    on.input('input', () => {
      el.value = input.value;
      validate(internals, input);
    });

    on.change('input', () => {
      el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    });

    syncAttributes(el, tags);
    validate(internals, input);
  },
  update({ el, name, val, tags, internals }) {
    const input = tags.one('input');

    if (name === 'disabled') {
      input.disabled = !!val;
    } else if (name === 'value') {
      if (input.value !== (val ?? '')) input.value = val ?? '';
    } else if (ATTRS.includes(name)) {
      setAttr(input, name, val);
    }

    validate(internals, input);
  },
  // Form-associated hooks run with `this` bound to the element.
  reset() {
    this.value = defaults.get(this) ?? '';
    const input = this._tags?.one('input');
    if (!input) return;
    input.value = this.value;
    validate(this._ctx.internals, input);
  },
  disabled(disabled) {
    const input = this._tags?.one('input');
    if (input) input.disabled = disabled || this.disabled;
  },
  restore(state) {
    if (typeof state === 'string') this.value = state;
  }
}, import.meta.url);

/** Mirrors a prop onto the inner input; Boolean props toggle presence. */
function setAttr(input, name, val) {
  if (name === 'required') {
    input.toggleAttribute('required', !!val);
  } else if (val !== null && val !== undefined && !(typeof val === 'number' && Number.isNaN(val))) {
    input.setAttribute(name, val);
  } else {
    input.removeAttribute(name);
  }
}

function syncAttributes(el, tags) {
  const input = tags.one('input');

  // Proxy observed attributes down to native input inside Shadow DOM
  for (const attr of ATTRS) {
    setAttr(input, attr, el[attr]);
  }

  input.disabled = el.disabled;
  input.value = el.value || '';
}

function validate(internals, input) {
  internals.setFormValue(input.value);

  // Check validation and delegate state to ElementInternals
  if (!input.validity.valid) {
    internals.setValidity(input.validity, input.validationMessage, input);
  } else {
    internals.setValidity({});
  }
}
