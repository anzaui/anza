/**
 * tests/elements/tokens.test.js
 *
 * Component tokens fall back to the design tokens, and ui-chart builds a
 * valid translucent fill for any --color-interactive colour.
 */

import '../../src/elements/forms/input/index.js';
import '../../src/elements/forms/textarea/index.js';
import '../../src/elements/data/chart/index.js';

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

describe('element tokens', () => {
  let host;

  before(tokens);

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => host.remove());

  for (const [tag, inner] of [['ui-input', 'input'], ['ui-textarea', 'textarea']]) {
    it(`${tag} renders with default token values`, async () => {
      const el = document.createElement(tag);
      host.appendChild(el);
      await mounted(el);
      const style = getComputedStyle(el.shadowRoot.querySelector(inner));
      if (style.borderTopWidth !== '1px' || style.borderTopStyle !== 'solid') {
        throw new Error(`border: ${style.borderTopWidth} ${style.borderTopStyle}`);
      }
      if (parseFloat(style.paddingTop) <= 0 || parseFloat(style.paddingLeft) <= 0) {
        throw new Error(`padding: ${style.paddingTop} ${style.paddingLeft}`);
      }
      if (parseFloat(style.borderTopLeftRadius) <= 0) throw new Error(`radius: ${style.borderTopLeftRadius}`);
      if (style.fontSize !== '16px') throw new Error(`font-size: ${style.fontSize}`);
    });

    it(`${tag} tokens set on an ancestor still apply`, async () => {
      host.style.setProperty(`--${tag.slice(3)}-padding-x`, '20px');
      const el = document.createElement(tag);
      host.appendChild(el);
      await mounted(el);
      const style = getComputedStyle(el.shadowRoot.querySelector(inner));
      if (style.paddingLeft !== '20px') throw new Error(`padding-left: ${style.paddingLeft}`);
    });
  }

  it('ui-chart line fill uses a valid colour for an rgb() token', async () => {
    const stops = [];
    const original = CanvasGradient.prototype.addColorStop;
    CanvasGradient.prototype.addColorStop = function (offset, color) {
      stops.push(color);
      return original.call(this, offset, color);
    };
    const errors = [];
    const onError = (e) => errors.push(e.message || String(e.reason));
    window.addEventListener('error', onError);
    try {
      const chart = document.createElement('ui-chart');
      chart.setAttribute('type', 'line');
      chart.style.setProperty('--color-interactive', 'rgb(10, 20, 30)');
      chart.style.width = '300px';
      chart.style.height = '150px';
      chart.style.display = 'block';
      host.appendChild(chart);
      await mounted(chart);
      await tick(50);
    } finally {
      CanvasGradient.prototype.addColorStop = original;
      window.removeEventListener('error', onError);
    }
    if (errors.length) throw new Error(errors.join('; '));
    if (stops.length < 2) throw new Error('line fill gradient was not drawn');
    for (const color of stops) {
      if (!CSS.supports('color', color)) throw new Error(`invalid gradient colour: ${color}`);
    }
    if (stops[0] !== 'rgba(10, 20, 30, 0.2)') throw new Error(`top stop: ${stops[0]}`);
    if (stops[1] !== 'rgba(10, 20, 30, 0)') throw new Error(`bottom stop: ${stops[1]}`);
  });
});
