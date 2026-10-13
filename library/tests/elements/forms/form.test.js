/**
 * tests/elements/forms/form.test.js
 *
 * <ui-form> submits its slotted controls: submit buttons, Enter in a field
 * and requestSubmit() all build the payload from the light-DOM controls,
 * validate them and send it (or queue it offline).
 */

import '/src/elements/forms/form/index.js';
import '/src/elements/forms/input/index.js';
import '/src/elements/forms/checkbox/index.js';
import '/src/elements/primitives/button/index.js';
import { check } from '/src/core/offline/connectivity.js';

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

async function mounted(root) {
  const els = [root, ...root.querySelectorAll('*')].filter((n) => n.localName.startsWith('ui-'));
  for (let i = 0; i < 200 && !els.every((n) => n._ctx); i++) await tick(10);
  if (!els.every((n) => n._ctx)) throw new Error('elements never mounted');
  await tick(0);
}

function once(el, type) {
  return new Promise((resolve) => el.addEventListener(type, resolve, { once: true }));
}

describe('<ui-form>', () => {
  let form;
  let realFetch;
  let requests;

  beforeEach(async () => {
    realFetch = globalThis.fetch;
    requests = [];
    globalThis.fetch = async (url, init = {}) => {
      if ((init.method || 'GET') === 'HEAD') return new Response(null, { status: 200 });
      if (!String(url).includes('/api/')) return realFetch(url, init);
      requests.push({ url: String(url), init });
      return new Response('{"ok":true}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
    await check(true);
    form = document.createElement('ui-form');
    form.setAttribute('action', '/api/profile');
    form.setAttribute('method', 'put');
    form.innerHTML = `
      <ui-input name="handle" value="fescii"></ui-input>
      <ui-checkbox name="agree" value="yes" checked></ui-checkbox>
      <ui-checkbox name="spam" value="yes"></ui-checkbox>
      <input name="native" value="n1">
      <input name="off" value="x" disabled>
      <input type="checkbox" name="box">
      <ui-button type="submit" name="intent" value="save">Save</ui-button>
    `;
    document.body.appendChild(form);
    await mounted(form);
  });

  afterEach(async () => {
    form.remove();
    globalThis.fetch = realFetch;
    await check(true);
  });

  it('submits from a slotted submit button with the controls as payload', async () => {
    const start = once(form, 'submit-start');
    const success = once(form, 'success');
    form.querySelector('ui-button').shadowRoot.querySelector('button').click();
    const { detail } = await start;
    const expected = { handle: 'fescii', agree: 'yes', native: 'n1', intent: 'save' };
    if (JSON.stringify(detail.payload) !== JSON.stringify(expected)) {
      throw new Error(`payload ${JSON.stringify(detail.payload)}`);
    }
    if (!(detail.formData instanceof FormData)) throw new Error('detail.formData missing');
    const done = await success;
    if (!(done.detail instanceof Response)) throw new Error('success detail is not the Response');
    if (requests.length !== 1) throw new Error(`expected 1 request, got ${requests.length}`);
    const [req] = requests;
    if (!req.url.endsWith('/api/profile') || req.init.method !== 'PUT') throw new Error(`${req.init.method} ${req.url}`);
    if (JSON.parse(req.init.body).handle !== 'fescii') throw new Error(`body ${req.init.body}`);
  });

  it('submits on Enter in a slotted text field', async () => {
    const start = once(form, 'submit-start');
    const field = form.querySelector('ui-input').shadowRoot.querySelector('input');
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true, cancelable: true }));
    const { detail } = await start;
    if (detail.payload.handle !== 'fescii' || 'intent' in detail.payload) {
      throw new Error(`payload ${JSON.stringify(detail.payload)}`);
    }
  });

  it('requestSubmit() validates and fires invalid instead of sending', async () => {
    const input = form.querySelector('ui-input');
    input.required = true;
    input.value = '';
    await tick(0);
    const invalid = once(form, 'invalid');
    form.requestSubmit();
    await invalid;
    await tick(20);
    if (requests.length !== 0) throw new Error('invalid form was sent');
  });

  it('a native submit button submits and GET sends a query string', async () => {
    form.method = 'GET';
    const button = document.createElement('button');
    button.textContent = 'Go';
    form.appendChild(button);
    const success = once(form, 'success');
    button.click();
    await success;
    const url = new URL(requests[0].url, location.href);
    if (requests[0].init.body !== undefined) throw new Error('GET sent a body');
    if (url.searchParams.get('handle') !== 'fescii') throw new Error(`url ${url}`);
  });

  it('queues the payload when offline and fires offline-queued', async () => {
    globalThis.fetch = async (url, init = {}) => {
      if ((init.method || 'GET') === 'HEAD') throw new TypeError('offline');
      return realFetch(url, init);
    };
    await check(true);
    form.offline = true;
    const queued = once(form, 'offline-queued');
    form.requestSubmit();
    const { detail } = await queued;
    if (typeof detail.syncId !== 'string' || detail.payload.handle !== 'fescii') {
      throw new Error(`detail ${JSON.stringify(detail)}`);
    }
  });
});
