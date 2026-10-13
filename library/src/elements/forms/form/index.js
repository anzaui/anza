/**
 * src/elements/forms/form/index.js
 *
 * Form Orchestrator: <ui-form>
 * Wraps form controls and handles accessible form submission, validation
 * and automatic offline background sync queue buffering.
 *
 * The inner <form> lives in the shadow root, so the slotted (light DOM)
 * controls never belong to it. The element therefore does the native form's
 * job itself: submit buttons, Enter in a text field and `requestSubmit()`
 * all run one submission over the controls it contains.
 *
 * Source: doc 04 — Web Components §9, doc 13 — Offline and Background §5
 */

import { ui } from '../../../core/ui/index.js';
import { check } from '../../../core/offline/connectivity.js';
import { queue } from '../../../core/offline/queue.js';
import { pipeline } from '../../../core/api/pipeline.js';
import { execute } from '../../../core/api/fetch.js';
import { internalsMap, formValueMap } from '../../../core/ui/define/state.js';

/** Input types where Enter submits (implicit submission). */
const NO_IMPLICIT = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'image', 'file', 'color', 'range', 'hidden']);
/** Native input types that are buttons, never data. */
const BUTTON_TYPES = new Set(['submit', 'reset', 'button', 'image']);

ui.element('ui-form', {
  style: './style.css',
  template: './index.html',
  props: {
    action: { type: String, reflect: true },
    method: { type: String, reflect: true },
    offline: { type: Boolean, reflect: true }
  },
  methods: {
    /**
     * Validates and submits the contained controls, like
     * HTMLFormElement.requestSubmit(). `submitter` (a submit button inside
     * the form) adds its name=value to the payload.
     */
    requestSubmit(submitter = null) {
      return submit(this, submitter);
    }
  },
  mount({ el, tags, on, ctrl }) {
    const form = tags.one('form');

    // The shadow <form> only submits when script calls requestSubmit() on it.
    on.submit(form, (e) => {
      e.preventDefault();
      submit(el, null);
    });

    // Submit buttons in the light DOM. The click is composed, so a click on
    // a ui-button's inner <button> arrives here retargeted to the ui-button.
    el.addEventListener('click', (e) => {
      const button = submitterOf(el, e.target);
      if (!button) return;
      e.preventDefault();
      submit(el, button);
    }, { signal: ctrl.signal });

    // Implicit submission: Enter in a single-line text field.
    el.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.defaultPrevented || e.isComposing) return;
      const field = e.composedPath()[0];
      if (!(field instanceof HTMLInputElement) || NO_IMPLICIT.has(field.type)) return;
      if (field.form) return; // owned by a native form of its own
      e.preventDefault();
      submit(el, null);
    }, { signal: ctrl.signal });

    syncAttributes(el, tags);
  },
  update({ el, name, tags }) {
    if (name === 'action' || name === 'method') {
      syncAttributes(el, tags);
    }
  }
}, import.meta.url);

function syncAttributes(el, tags) {
  const form = tags.one('form');
  if (!form) return;
  if (el.action) {
    form.setAttribute('action', el.action);
  }
  if (el.method) {
    form.setAttribute('method', el.method);
  }
}

/** True when `node` belongs to this ui-form (not a nested one or a native form). */
function owned(el, node) {
  if (node.closest('ui-form') !== el) return false;
  return !('form' in node && node.form instanceof HTMLFormElement);
}

/** The submit button a click inside `el` activated, if any. */
function submitterOf(el, target) {
  if (!(target instanceof Element)) return null;
  const button = target.closest('button, input[type="submit"], input[type="image"], ui-button');
  if (!button || !el.contains(button) || !owned(el, button)) return null;
  if (button.localName === 'ui-button') {
    return button.type === 'submit' && !button.disabled && !button.loading ? button : null;
  }
  if (button.disabled) return null;
  if (button.localName === 'button') {
    const type = (button.getAttribute('type') || 'submit').toLowerCase();
    return type === 'submit' ? button : null;
  }
  return button;
}

/** The form-associated controls inside `el`, in tree order. */
function controlsOf(el) {
  return Array.from(el.querySelectorAll('*')).filter((node) => {
    if (!owned(el, node)) return false;
    if (node instanceof HTMLInputElement || node instanceof HTMLSelectElement ||
        node instanceof HTMLTextAreaElement || node instanceof HTMLButtonElement) return true;
    return Boolean(node.constructor.formAssociated);
  });
}

function isDisabled(node) {
  try {
    return node.matches(':disabled');
  } catch {
    return Boolean(node.disabled);
  }
}

/** True for controls that are buttons: they only contribute as the submitter. */
function isButton(node) {
  if (node instanceof HTMLButtonElement) return true;
  if (node instanceof HTMLInputElement) return BUTTON_TYPES.has(node.type);
  return node.localName === 'ui-button' || ['submit', 'reset', 'button'].includes(node.type);
}

/** Appends a value set with ElementInternals.setFormValue() to `data`. */
function appendFormValue(data, name, value) {
  if (value == null) return;
  if (value instanceof FormData) {
    for (const [key, entry] of value.entries()) data.append(key, entry);
  } else if (value instanceof File) {
    data.append(name, value);
  } else {
    data.append(name, String(value));
  }
}

/** Builds the FormData of the controls, the way a native form would. */
function collect(controls, submitter) {
  const data = new FormData();
  for (const node of controls) {
    if (isDisabled(node)) continue;
    if (isButton(node)) {
      if (node !== submitter) continue;
      const name = node.getAttribute('name');
      if (name) data.append(name, node.value ?? '');
      continue;
    }
    if (node instanceof HTMLInputElement) {
      if (!node.name) continue;
      if (node.type === 'checkbox' || node.type === 'radio') {
        if (node.checked) data.append(node.name, node.value);
      } else if (node.type === 'file') {
        for (const file of node.files ?? []) data.append(node.name, file);
      } else {
        data.append(node.name, node.value);
      }
    } else if (node instanceof HTMLSelectElement) {
      if (!node.name) continue;
      for (const option of node.selectedOptions) {
        if (!option.disabled) data.append(node.name, option.value);
      }
    } else if (node instanceof HTMLTextAreaElement) {
      if (node.name) data.append(node.name, node.value);
    } else {
      // Form-associated custom element.
      const name = node.getAttribute('name');
      if (formValueMap.has(node)) {
        // Factory element: use exactly what it handed to setFormValue().
        if (name || formValueMap.get(node) instanceof FormData) {
          appendFormValue(data, name, formValueMap.get(node));
        }
      } else if (name) {
        if ('checked' in node) {
          if (node.checked) data.append(name, node.value || 'on');
        } else if (node.value != null) {
          data.append(name, String(node.value));
        }
      }
    }
  }
  return data;
}

/** First invalid control after checking all of them, or null. */
function firstInvalid(controls) {
  let first = null;
  for (const node of controls) {
    if (isDisabled(node) || isButton(node)) continue;
    const target = internalsMap.get(node) ?? node;
    if (typeof target.checkValidity !== 'function') continue;
    if (!target.checkValidity() && !first) first = { node, target };
  }
  return first;
}

/** FormData to a plain object; repeated names become arrays. */
function toPayload(data) {
  const payload = {};
  for (const [key, value] of data.entries()) {
    if (Object.hasOwn(payload, key)) {
      payload[key] = [].concat(payload[key], value);
    } else {
      payload[key] = value;
    }
  }
  return payload;
}

async function submit(el, submitter) {
  const controls = controlsOf(el);

  // Validate every control; report (focus + message) only the first invalid one.
  const invalid = firstInvalid(controls);
  if (invalid) {
    if (typeof invalid.target.reportValidity === 'function') invalid.target.reportValidity();
    el.dispatchEvent(new CustomEvent('invalid', { bubbles: true, composed: true }));
    return;
  }

  const action = el.action || window.location.href;
  const method = (el.method || 'POST').toUpperCase();
  const formData = collect(controls, submitter);
  const payload = toPayload(formData);

  el.dispatchEvent(new CustomEvent('submit-start', {
    detail: { payload, formData, submitter },
    bubbles: true,
    composed: true
  }));

  const online = await check();

  if (!online && el.offline) {
    // Offline mode: push into background sync queue
    try {
      const syncId = await queue.push('offline-form-submit', {
        url: action,
        method,
        headers: { 'Content-Type': 'application/json' },
        body: payload
      });

      // Register the Background Sync tag when a service worker is registered.
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg?.sync) {
          await reg.sync.register('pending');
        }
      }

      el.dispatchEvent(new CustomEvent('offline-queued', { detail: { syncId, payload }, bubbles: true, composed: true }));
    } catch (err) {
      el.dispatchEvent(new CustomEvent('submit-error', { detail: err, bubbles: true, composed: true }));
    }
    return;
  }

  try {
    const res = await pipeline.run(request(action, method, formData, payload, el), execute);
    el.dispatchEvent(new CustomEvent('success', { detail: res, bubbles: true, composed: true }));
  } catch (err) {
    el.dispatchEvent(new CustomEvent('submit-error', { detail: err, bubbles: true, composed: true }));
  }
}

/**
 * Request descriptor: GET/HEAD put the fields in the query string; a form
 * with a file goes out as multipart FormData; everything else as JSON.
 */
function request(action, method, formData, payload, el) {
  const signal = el.ctrl?.signal;
  if (method === 'GET' || method === 'HEAD') {
    const url = new URL(action, window.location.href);
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') url.searchParams.append(key, value);
    }
    return { url: url.href, method, signal };
  }
  const hasFile = Array.from(formData.values()).some((value) => value instanceof File);
  if (hasFile) {
    return { url: action, method, body: formData, signal };
  }
  return {
    url: action,
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal
  };
}
