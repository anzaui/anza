/**
 * src/elements/forms/radio/index.js
 *
 * Form Control: <ui-radio>
 * Standard-compliant form-participating radio selection element. Cooperatively
 * coordinates selections within scopes sharing a `name` attribute.
 *
 * Source: doc 04 — Web Components §9, doc 05 — Native UI Primitives §3
 */

import { ui } from '../../../core/ui/index.js';

/** `checked` attribute at first mount: what a form reset restores. */
const defaults = new WeakMap();

ui.element('ui-radio', {
  style: './style.css',
  template: './index.html',
  form: true,
  props: {
    checked: { type: Boolean, reflect: true, state: true },
    disabled: { type: Boolean, reflect: true, state: true },
    name: { type: String, reflect: true },
    value: { type: String, reflect: true }
  },
  mount({ el, internals, ctrl }) {
    if (!defaults.has(el)) defaults.set(el, el.hasAttribute('checked'));

    if (!el.hasAttribute('role')) {
      el.setAttribute('role', 'radio');
    }

    // User selection: sync the form value before `change`.
    const select = () => {
      el.checked = true;
      syncAttributes(el, internals);
      uncheckOthers(el);
      rove(el);
      el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    };

    // The host is outside the shadow root, so `on` cannot bind it.
    el.addEventListener('click', (e) => {
      if (el.disabled || el.checked) return;
      e.preventDefault();
      select();
    }, { signal: ctrl.signal });

    el.addEventListener('keydown', (e) => {
      if (el.disabled) return;
      const step = STEPS[e.key];
      if (step) {
        // Arrow keys move focus and selection through the group, like
        // native radios, skipping disabled ones and wrapping at the ends.
        const enabled = groupOf(el).filter((radio) => !isDisabled(radio));
        if (enabled.length < 2) return;
        e.preventDefault();
        const index = enabled.indexOf(el);
        const next = enabled[(index + step + enabled.length) % enabled.length];
        next.focus();
        if (!next.checked) next.click();
        return;
      }
      if (el.checked) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        select();
      }
    }, { signal: ctrl.signal });

    syncAttributes(el, internals);
  },
  update({ el, name, val, internals }) {
    if (name === 'checked' || name === 'disabled') {
      syncAttributes(el, internals);
      if (name === 'checked' && el.checked) {
        uncheckOthers(el);
        rove(el);
      }
    }
  },
  // Form-associated hooks run with `this` bound to the element.
  reset() {
    this.checked = defaults.get(this) ?? false;
    if (this._ctx) syncAttributes(this, this._ctx.internals);
  },
  disabled() {
    rove(this);
  },
  restore(state) {
    this.checked = state != null;
  }
}, import.meta.url);

function syncAttributes(el, internals) {
  const checked = el.checked;
  const disabled = el.disabled;

  if (checked) {
    internals.states.add('checked');
    el.setAttribute('aria-checked', 'true');
  } else {
    internals.states.delete('checked');
    el.setAttribute('aria-checked', 'false');
  }

  if (disabled) {
    internals.states.add('disabled');
    el.setAttribute('aria-disabled', 'true');
  } else {
    internals.states.delete('disabled');
    el.removeAttribute('aria-disabled');
  }

  const subValue = checked ? (el.value || 'on') : null;
  internals.setFormValue(subValue);
  rove(el);
}

/** Arrow keys and the direction they move in the group. */
const STEPS = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };

/** Checked state, also for a radio that has not upgraded yet. */
const isChecked = (radio) => (typeof radio.checked === 'boolean' ? radio.checked : radio.hasAttribute('checked'));

/** Disabled state, including a disabled fieldset or form. */
function isDisabled(radio) {
  if (radio.hasAttribute('disabled') || radio.disabled === true) return true;
  try {
    return radio.matches(':disabled');
  } catch {
    return false;
  }
}

/** Radios sharing `el`'s name in its root node, in tree order (just `el` without a name). */
function groupOf(el) {
  const name = el.name ?? el.getAttribute('name');
  if (!name) return [el];
  const root = el.getRootNode();
  return Array.from(root.querySelectorAll(`ui-radio[name="${CSS.escape(name)}"]`));
}

/**
 * Roving tabindex: the group has one tab stop, the checked radio (or the
 * first enabled one when none is checked). Disabled radios are skipped.
 */
function rove(el) {
  const group = groupOf(el);
  const enabled = group.filter((radio) => !isDisabled(radio));
  const stop = enabled.find(isChecked) ?? enabled[0];
  for (const radio of group) {
    if (isDisabled(radio)) radio.removeAttribute('tabindex');
    else radio.setAttribute('tabindex', radio === stop ? '0' : '-1');
  }
}

function uncheckOthers(el) {
  const name = el.name;
  if (!name) return;

  // Find and query all other radio components in the same root node sharing the same name
  const root = el.getRootNode();
  const radios = Array.from(root.querySelectorAll(`ui-radio[name="${CSS.escape(name)}"]`));

  for (const radio of radios) {
    if (radio !== el && radio.checked) {
      radio.checked = false;
      radio.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }
  }
}
