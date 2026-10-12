/**
 * src/elements/forms/textarea/index.js
 *
 * Form Control: <ui-textarea>
 * Form-participating multi-line text area supporting validation,
 * custom disabled states, and dynamic auto-resizing.
 *
 * Source: doc 04 — Web Components §9, doc 05 — Native UI Primitives §3
 */

import { ui } from '../../../core/ui/index.js';

/** Value attribute at first mount: what a form reset restores. */
const defaults = new WeakMap();

const ATTRS = ['placeholder', 'required', 'minlength', 'maxlength', 'rows'];

ui.element('ui-textarea', {
  style: './style.css',
  template: './index.html',
  form: true,
  props: {
    value: { type: String, reflect: true },
    placeholder: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true, state: true },
    required: { type: Boolean, reflect: true },
    minlength: { type: Number, reflect: true },
    maxlength: { type: Number, reflect: true },
    autoresize: { type: Boolean, reflect: true },
    rows: { type: Number, reflect: true }
  },
  mount({ el, internals, tags, on }) {
    const area = tags.one('textarea');
    if (!defaults.has(el)) defaults.set(el, el.getAttribute('value') ?? '');

    on.input('textarea', () => {
      el.value = area.value;
      resize(el, area);
      validate(internals, area);
    });

    on.change('textarea', () => {
      el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    });

    // Auto-resizing ResizeObserver setup
    const observer = new ResizeObserver(() => resize(el, area));
    observer.observe(area);
    el.ctrl.signal.addEventListener('abort', () => observer.disconnect());

    syncAttributes(el, tags);
    validate(internals, area);
  },
  update({ el, name, val, tags, internals }) {
    const area = tags.one('textarea');

    if (name === 'disabled') {
      area.disabled = !!val;
    } else if (name === 'value') {
      if (area.value !== (val ?? '')) area.value = val ?? '';
    } else if (ATTRS.includes(name)) {
      setAttr(area, name, val);
    }

    resize(el, area);
    validate(internals, area);
  },
  // Form-associated hooks run with `this` bound to the element.
  reset() {
    this.value = defaults.get(this) ?? '';
    const area = this._tags?.one('textarea');
    if (!area) return;
    area.value = this.value;
    validate(this._ctx.internals, area);
  },
  disabled(disabled) {
    const area = this._tags?.one('textarea');
    if (area) area.disabled = disabled || this.disabled;
  },
  restore(state) {
    if (typeof state === 'string') this.value = state;
  }
}, import.meta.url);

/** Mirrors a prop onto the inner textarea; Boolean props toggle presence. */
function setAttr(area, name, val) {
  if (name === 'required') {
    area.toggleAttribute('required', !!val);
  } else if (val !== null && val !== undefined && !(typeof val === 'number' && Number.isNaN(val))) {
    area.setAttribute(name, val);
  } else {
    area.removeAttribute(name);
  }
}

function syncAttributes(el, tags) {
  const area = tags.one('textarea');

  for (const attr of ATTRS) {
    setAttr(area, attr, el[attr]);
  }

  area.disabled = el.disabled;
  area.value = el.value || '';

  resize(el, area);
}

function resize(el, area) {
  if (!el.autoresize) return;
  area.style.height = 'auto';
  area.style.height = `${area.scrollHeight}px`;
}

function validate(internals, area) {
  internals.setFormValue(area.value);

  if (!area.validity.valid) {
    internals.setValidity(area.validity, area.validationMessage, area);
  } else {
    internals.setValidity({});
  }
}
