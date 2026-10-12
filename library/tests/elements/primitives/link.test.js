/**
 * tests/elements/primitives/link.test.js
 *
 * <ui-link> href scheme filtering.
 */

import '../../../src/elements/primitives/link/index.js';

async function mount(href) {
  const el = document.createElement('ui-link');
  el.setAttribute('href', href);
  el.textContent = 'x';
  document.body.appendChild(el);
  for (let i = 0; i < 100 && !el.shadowRoot?.querySelector('a'); i++) {
    await new Promise((r) => setTimeout(r, 10));
  }
  await new Promise((r) => setTimeout(r, 0));
  return el;
}

describe('<ui-link> href filtering', () => {
  afterEach(() => document.querySelectorAll('ui-link').forEach((n) => n.remove()));

  const payloads = [
    'javascript:alert(1)',
    'java\tscript:alert(1)',
    'JaVaScRiPt:alert(1)',
    '\x01javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:x'
  ];

  for (const payload of payloads) {
    it(`does not put ${JSON.stringify(payload)} on the inner anchor`, async () => {
      const el = await mount(payload);
      const a = el.shadowRoot.querySelector('a');
      if (a.hasAttribute('href')) throw new Error(`unsafe href set: ${a.getAttribute('href')}`);
    });
  }

  it('keeps safe hrefs', async () => {
    const el = await mount('/docs/intro');
    const a = el.shadowRoot.querySelector('a');
    if (a.getAttribute('href') !== '/docs/intro') throw new Error(`href: ${a.getAttribute('href')}`);
  });

  it('drops the href when it changes to an unsafe value', async () => {
    const el = await mount('/ok');
    el.href = 'javascript:alert(1)';
    await new Promise((r) => setTimeout(r, 20));
    const a = el.shadowRoot.querySelector('a');
    if (a.hasAttribute('href')) throw new Error('unsafe href kept after update');
  });
});
