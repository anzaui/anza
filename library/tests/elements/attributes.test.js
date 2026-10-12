/**
 * tests/elements/attributes.test.js
 *
 * E3: documented attribute values that previously had no effect.
 */

import '../../src/elements/data/stat/index.js';
import '../../src/elements/layout/surface/index.js';
import '../../src/elements/primitives/text/index.js';
import { position } from '../../src/core/platform/polyfills/anchor.js';

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

/** Token values the shadow styles resolve against. */
const TOKENS = `
  --color-feedback-success: rgb(0, 128, 0);
  --color-feedback-error: rgb(200, 0, 0);
  --color-content-secondary: rgb(10, 20, 30);
  --color-content-primary: rgb(1, 1, 1);
  --color-border-default: rgb(9, 9, 9);
  --color-surface-page: rgb(255, 255, 255);
  --color-surface-elevated: rgb(250, 250, 250);
  --shadow-md: 0 1px 2px rgb(0, 0, 0);
  --space-px: 1px;
`;

async function mount(html, selector) {
  const host = document.createElement('div');
  host.setAttribute('style', TOKENS);
  host.innerHTML = html;
  document.body.appendChild(host);
  const el = host.firstElementChild;
  for (let i = 0; i < 200 && !(el._ctx && el.shadowRoot.querySelector(selector)); i++) await tick(10);
  await tick(20);
  return el;
}

describe('Documented attribute values (E3)', () => {
  afterEach(() => document.querySelectorAll('body > div[style]').forEach((n) => n.remove()));

  it('ui-stat trend="up" / "down" use the positive / negative colours', async () => {
    const up = await mount('<ui-stat trend="up"><span slot="trend">+1</span></ui-stat>', '.trend-box');
    const down = await mount('<ui-stat trend="down"><span slot="trend">-1</span></ui-stat>', '.trend-box');
    const color = (el) => getComputedStyle(el.shadowRoot.querySelector('.trend-box')).color;
    if (color(up) !== 'rgb(0, 128, 0)') throw new Error(`up: ${color(up)}`);
    if (color(down) !== 'rgb(200, 0, 0)') throw new Error(`down: ${color(down)}`);
  });

  it('ui-surface variant="bordered" draws a border without a shadow', async () => {
    const el = await mount('<ui-surface variant="bordered">x</ui-surface>', '.surface');
    const cs = getComputedStyle(el.shadowRoot.querySelector('.surface'));
    if (cs.borderTopColor !== 'rgb(9, 9, 9)' || cs.borderTopWidth !== '1px') {
      throw new Error(`border: ${cs.borderTopWidth} ${cs.borderTopColor}`);
    }
    if (cs.boxShadow !== 'none') throw new Error(`shadow: ${cs.boxShadow}`);
  });

  it('ui-text color="muted" resolves to the secondary content colour', async () => {
    const el = await mount('<ui-text color="muted">x</ui-text>', '#root');
    const color = getComputedStyle(el.shadowRoot.querySelector('#root')).color;
    if (color !== 'rgb(10, 20, 30)') throw new Error(`muted: ${color}`);
  });

  it('anchor polyfill supports right-end and left-end', () => {
    const anchor = document.createElement('div');
    anchor.style.cssText = 'position:fixed;top:200px;left:300px;width:100px;height:60px';
    const floating = document.createElement('div');
    floating.style.cssText = 'position:fixed;width:50px;height:20px';
    document.body.append(anchor, floating);
    try {
      position(floating, anchor, { placement: 'right-end', offset: 8, mode: 'fixed' });
      const r = floating.getBoundingClientRect();
      if (Math.round(r.left) !== 408 || Math.round(r.bottom) !== 260) {
        throw new Error(`right-end at ${r.left},${r.bottom}`);
      }
      position(floating, anchor, { placement: 'left-end', offset: 8, mode: 'fixed' });
      const l = floating.getBoundingClientRect();
      if (Math.round(l.right) !== 292 || Math.round(l.bottom) !== 260) {
        throw new Error(`left-end at ${l.right},${l.bottom}`);
      }
    } finally {
      anchor.remove();
      floating.remove();
    }
  });
});
