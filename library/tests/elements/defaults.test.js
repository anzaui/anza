/**
 * tests/elements/defaults.test.js
 *
 * Elements styled by attribute selectors render with their prop defaults:
 * the default is reflected to the attribute on connect.
 */

import '../../src/elements/primitives/divider/index.js';
import '../../src/elements/overlay/drawer/index.js';
import '../../src/elements/primitives/button/index.js';
import '../../src/elements/forms/input/index.js';
import '../../src/elements/forms/textarea/index.js';
import '../../src/elements/forms/select/index.js';
import '../../src/elements/forms/toggle/index.js';

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

async function tokens() {
  if (document.querySelector('link[data-test-tokens]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/src/tokens/index.css';
  link.dataset.testTokens = '';
  const loaded = new Promise((resolve) => { link.onload = resolve; link.onerror = resolve; });
  document.head.appendChild(link);
  await loaded;
}

async function mounted(el) {
  for (let i = 0; i < 200 && !el._ctx; i++) await tick(10);
  if (!el._ctx) throw new Error(`${el.localName} never mounted`);
  await tick(20);
}

describe('prop defaults drive attribute-selector CSS', () => {
  let host;

  before(tokens);

  beforeEach(() => {
    host = document.createElement('div');
    host.style.width = '400px';
    document.body.appendChild(host);
  });

  afterEach(() => host.remove());

  it('ui-divider without orientation draws a horizontal line', async () => {
    const divider = document.createElement('ui-divider');
    host.appendChild(divider);
    await mounted(divider);
    if (divider.getAttribute('orientation') !== 'horizontal') {
      throw new Error(`orientation attribute: ${divider.getAttribute('orientation')}`);
    }
    const hr = divider.shadowRoot.querySelector('hr');
    const box = hr.getBoundingClientRect();
    if (box.height <= 0 || box.width <= 0) throw new Error(`hr is ${box.width}x${box.height}`);
  });

  it('ui-drawer without placement slides in from the right', async () => {
    const drawer = document.createElement('ui-drawer');
    host.appendChild(drawer);
    await mounted(drawer);
    if (drawer.getAttribute('placement') !== 'right') {
      throw new Error(`placement attribute: ${drawer.getAttribute('placement')}`);
    }
    const dialog = drawer.shadowRoot.querySelector('dialog');
    const style = getComputedStyle(dialog);
    if (style.right !== '0px') throw new Error(`right: ${style.right}`);
    if (style.transform === 'none') throw new Error('closed drawer is not translated off-screen');
  });
});

describe('kit :state() from markup attributes', () => {
  let host;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => host.remove());

  const cases = [
    ['<ui-button disabled loading>x</ui-button>', ['disabled', 'loading']],
    ['<ui-input disabled></ui-input>', ['disabled']],
    ['<ui-textarea disabled></ui-textarea>', ['disabled']],
    ['<ui-select disabled></ui-select>', ['disabled']],
    ['<ui-toggle checked></ui-toggle>', ['checked', 'on']]
  ];

  for (const [html, states] of cases) {
    it(`${html} sets ${states.join(', ')}`, async () => {
      host.innerHTML = html;
      const el = host.firstElementChild;
      await mounted(el);
      for (const state of states) {
        if (!el.matches(`:state(${state})`)) throw new Error(`missing :state(${state})`);
      }
    });
  }
});
