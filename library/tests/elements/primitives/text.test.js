/**
 * tests/elements/primitives/text.test.js
 *
 * <ui-text as="…"> renders only text-level / heading tags.
 */

import '../../../src/elements/primitives/text/index.js';

async function mount(as) {
  const el = document.createElement('ui-text');
  el.setAttribute('as', as);
  el.textContent = 'x';
  document.body.appendChild(el);
  for (let i = 0; i < 100 && !el.shadowRoot?.querySelector('#root'); i++) {
    await new Promise((r) => setTimeout(r, 10));
  }
  await new Promise((r) => setTimeout(r, 0));
  return el.shadowRoot.querySelector('#root');
}

describe('<ui-text> as', () => {
  afterEach(() => document.querySelectorAll('ui-text').forEach((n) => n.remove()));

  for (const tag of ['p', 'h2', 'strong', 'code']) {
    it(`renders <${tag}>`, async () => {
      const root = await mount(tag);
      if (root.tagName.toLowerCase() !== tag) throw new Error(`expected <${tag}>, got <${root.tagName.toLowerCase()}>`);
    });
  }

  for (const tag of ['script', 'iframe', 'object', 'img', 'not a tag', '1x']) {
    it(`falls back to <span> for ${JSON.stringify(tag)}`, async () => {
      const root = await mount(tag);
      if (root.tagName.toLowerCase() !== 'span') throw new Error(`expected <span>, got <${root.tagName.toLowerCase()}>`);
    });
  }
});
