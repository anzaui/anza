/**
 * tests/elements/forms/associated.test.js
 *
 * E2: form-associated kit elements contribute to a real <form> (FormData),
 * honour reset, and dispatch `change` (bubbles, composed) on user change.
 */

import '../../../src/elements/forms/input/index.js';
import '../../../src/elements/forms/textarea/index.js';
import '../../../src/elements/forms/checkbox/index.js';
import '../../../src/elements/forms/toggle/index.js';
import '../../../src/elements/forms/radio/index.js';
import '../../../src/elements/forms/select/index.js';
import '../../../src/elements/primitives/button/index.js';

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

/** Renders `html` inside a <form>, waits for every ui-* child to mount. */
async function form(html) {
  const f = document.createElement('form');
  f.innerHTML = html;
  document.body.appendChild(f);
  const els = [...f.querySelectorAll('*')].filter((n) => n.localName.startsWith('ui-'));
  for (let i = 0; i < 200 && !els.every((n) => n._ctx); i++) await tick(10);
  if (!els.every((n) => n._ctx)) throw new Error('elements never mounted');
  await tick(0);
  return f;
}

const data = (f) => Object.fromEntries(new FormData(f).entries());

/** Records `change` events that reach the document (proves bubbles + composed). */
function changes() {
  const seen = [];
  const handler = (e) => seen.push({ target: e.target.localName, composed: e.composed, bubbles: e.bubbles });
  document.addEventListener('change', handler);
  seen.stop = () => document.removeEventListener('change', handler);
  return seen;
}

describe('Form-associated kit elements (E2)', () => {
  afterEach(() => document.querySelectorAll('form').forEach((f) => f.remove()));

  describe('<ui-input>', () => {
    it('is not required unless the attribute is present', async () => {
      const f = await form('<ui-input name="q"></ui-input>');
      const el = f.querySelector('ui-input');
      const inner = el.shadowRoot.querySelector('input');
      if (inner.hasAttribute('required')) throw new Error('inner input is required without the attribute');
      if (!f.checkValidity()) throw new Error('form invalid with an optional empty input');
    });

    it('is required when the attribute is present', async () => {
      const f = await form('<ui-input name="q" required></ui-input>');
      if (f.checkValidity()) throw new Error('required empty input passed validation');
    });

    it('submits its value, updated by property and by typing', async () => {
      const f = await form('<ui-input name="q" value="first"></ui-input>');
      const el = f.querySelector('ui-input');
      if (data(f).q !== 'first') throw new Error(`initial: ${JSON.stringify(data(f))}`);

      el.value = 'second';
      await tick(0);
      if (data(f).q !== 'second') throw new Error(`after prop set: ${JSON.stringify(data(f))}`);

      const inner = el.shadowRoot.querySelector('input');
      inner.value = 'typed';
      inner.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      await tick(0);
      if (data(f).q !== 'typed') throw new Error(`after typing: ${JSON.stringify(data(f))}`);
    });

    it('form.reset() restores the initial value', async () => {
      const f = await form('<ui-input name="q" value="orig"></ui-input>');
      const el = f.querySelector('ui-input');
      el.value = 'changed';
      await tick(0);
      f.reset();
      await tick(0);
      if (el.value !== 'orig') throw new Error(`value after reset: ${el.value}`);
      if (el.shadowRoot.querySelector('input').value !== 'orig') throw new Error('inner input not reset');
      if (data(f).q !== 'orig') throw new Error(`form data after reset: ${JSON.stringify(data(f))}`);
    });
  });

  describe('<ui-textarea>', () => {
    it('submits its value and resets', async () => {
      const f = await form('<ui-textarea name="t" value="a"></ui-textarea>');
      const el = f.querySelector('ui-textarea');
      if (el.shadowRoot.querySelector('textarea').hasAttribute('required')) throw new Error('required without attribute');
      el.value = 'b';
      await tick(0);
      if (data(f).t !== 'b') throw new Error(`data: ${JSON.stringify(data(f))}`);
      f.reset();
      await tick(0);
      if (data(f).t !== 'a') throw new Error(`after reset: ${JSON.stringify(data(f))}`);
    });
  });

  describe('<ui-checkbox>', () => {
    it('toggles on click, emits change and updates FormData', async () => {
      const f = await form('<ui-checkbox name="tos" value="accepted">I agree</ui-checkbox>');
      const el = f.querySelector('ui-checkbox');
      const seen = changes();
      let inChange = null;
      el.addEventListener('change', () => { inChange = data(f).tos ?? null; });
      try {
        el.click();
        if (!el.checked) throw new Error('not checked after click');
        if (seen.length !== 1 || !seen[0].composed || !seen[0].bubbles) throw new Error(`change: ${JSON.stringify(seen)}`);
        if (inChange !== 'accepted') throw new Error(`FormData inside change: ${inChange}`);
        el.click();
        if (el.checked) throw new Error('still checked after second click');
        if ('tos' in data(f)) throw new Error('unchecked box still submitted');
      } finally {
        seen.stop();
      }
    });

    it('form.reset() restores the initial checked state', async () => {
      const f = await form('<ui-checkbox name="a" checked></ui-checkbox>');
      const el = f.querySelector('ui-checkbox');
      el.click();
      if (el.checked) throw new Error('click did not uncheck');
      f.reset();
      await tick(0);
      if (!el.checked || data(f).a !== 'on') throw new Error('reset did not restore checked');
    });
  });

  describe('<ui-toggle>', () => {
    it('toggles on click and emits change', async () => {
      const f = await form('<ui-toggle name="dark"></ui-toggle>');
      const el = f.querySelector('ui-toggle');
      const seen = changes();
      try {
        el.click();
        if (!el.checked || data(f).dark !== 'on') throw new Error('not on after click');
        if (seen.length !== 1 || !seen[0].composed) throw new Error(`change: ${JSON.stringify(seen)}`);
      } finally {
        seen.stop();
      }
    });
  });

  describe('<ui-radio>', () => {
    it('selects on click, unchecks siblings and emits change', async () => {
      const f = await form('<ui-radio name="plan" value="free" checked>Free</ui-radio><ui-radio name="plan" value="pro">Pro</ui-radio>');
      const [free, pro] = f.querySelectorAll('ui-radio');
      if (data(f).plan !== 'free') throw new Error(`initial: ${JSON.stringify(data(f))}`);
      const seen = changes();
      try {
        pro.click();
        await tick(0);
        if (!pro.checked || free.checked) throw new Error('selection not exclusive');
        if (data(f).plan !== 'pro') throw new Error(`after click: ${JSON.stringify(data(f))}`);
        if (!seen.some((e) => e.composed && e.bubbles)) throw new Error('no change event');
      } finally {
        seen.stop();
      }
    });
  });

  describe('<ui-select>', () => {
    it('selects an option on click, emits change and submits the value', async () => {
      const f = await form('<ui-select name="role"><button type="button" value="admin">Admin</button><button type="button" value="editor">Editor</button></ui-select>');
      const el = f.querySelector('ui-select');
      await tick(10);
      const seen = changes();
      try {
        el.querySelector('[value="editor"]').click();
        if (el.value !== 'editor') throw new Error(`value: ${el.value}`);
        if (data(f).role !== 'editor') throw new Error(`data: ${JSON.stringify(data(f))}`);
        if (seen.length !== 1 || !seen[0].composed) throw new Error(`change: ${JSON.stringify(seen)}`);
      } finally {
        seen.stop();
      }
    });
  });

  describe('<ui-button type="submit">', () => {
    it('submits the form with its name=value', async () => {
      const f = await form('<ui-input name="q" value="x"></ui-input><ui-button type="submit" name="action" value="save">Save</ui-button>');
      let submitted = null;
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        submitted = data(f);
      });
      f.querySelector('ui-button').shadowRoot.querySelector('button').click();
      if (!submitted) throw new Error('form was not submitted');
      if (submitted.action !== 'save' || submitted.q !== 'x') throw new Error(`submitted: ${JSON.stringify(submitted)}`);
      if ('action' in data(f)) throw new Error('button value leaked into later FormData');
    });
  });
});
