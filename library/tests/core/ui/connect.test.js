/**
 * tests/core/ui/connect.test.js
 *
 * Connect-time behaviour of ui.element: default reflection, initial
 * :state() values, closed shadow roots, container CSS files and the timing
 * of `anza:ready`.
 */

import { ui } from '../../../src/core/ui/index.js';
import { waitForPageReady } from '../../../src/core/router/loading.js';

const wait = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

describe('ui.element connect', () => {
  let host;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    host.remove();
  });

  it('reflects reflected prop defaults to absent attributes on connect', async () => {
    ui.element('test-reflect-defaults', {
      template: '<span></span>',
      props: {
        orientation: { type: String, default: 'horizontal' },
        size: { type: Number, default: 2 },
        open: { type: Boolean, default: false },
        hidden2: { type: String, default: 'x', reflect: false },
        data: { type: String, default: null }
      }
    });
    const el = document.createElement('test-reflect-defaults');
    host.appendChild(el);
    await wait();
    assert(el.getAttribute('orientation') === 'horizontal', `orientation=${el.getAttribute('orientation')}`);
    assert(el.getAttribute('size') === '2', `size=${el.getAttribute('size')}`);
    assert(!el.hasAttribute('open'), 'false boolean must not reflect');
    assert(!el.hasAttribute('hidden2'), 'reflect:false prop must not reflect');
    assert(!el.hasAttribute('data'), 'null default must not reflect');
  });

  it('never overwrites an author attribute or a value set before connect', async () => {
    ui.element('test-reflect-author', {
      template: '<span></span>',
      props: { orientation: { type: String, default: 'horizontal' }, tone: { type: String, default: 'plain' } }
    });
    host.innerHTML = '<test-reflect-author orientation="vertical"></test-reflect-author>';
    const el = host.firstElementChild;
    const other = document.createElement('test-reflect-author');
    other.tone = 'loud';
    host.appendChild(other);
    await wait();
    assert(el.getAttribute('orientation') === 'vertical', 'author attribute was clobbered');
    assert(el.orientation === 'vertical', 'prop does not follow the author attribute');
    assert(other.getAttribute('tone') === 'loud', 'pre-connect value was not reflected');
  });

  it('applies :state() for attributes present in the markup', async () => {
    ui.element('test-initial-state', {
      template: '<span></span>',
      props: { busy: { type: Boolean, state: true }, mode: { type: String, default: 'on', state: true } }
    });
    host.innerHTML = '<test-initial-state busy></test-initial-state>';
    const el = host.firstElementChild;
    await wait();
    assert(el.matches(':state(busy)'), 'initial busy attribute did not set :state(busy)');
    assert(el.matches(':state(mode)'), 'truthy default did not set :state(mode)');
    el.busy = false;
    assert(!el.matches(':state(busy)'), ':state(busy) not removed');
  });

  it('renders and wires with mode: closed', async () => {
    let refs = null;
    ui.element('test-closed-root', {
      mode: 'closed',
      template: '<b ref="label">hi</b>',
      mount(ctx) { refs = ctx.refs; }
    });
    const el = document.createElement('test-closed-root');
    let error = null;
    const onError = (e) => { error = e; };
    window.addEventListener('unhandledrejection', onError);
    host.appendChild(el);
    await wait();
    await wait();
    window.removeEventListener('unhandledrejection', onError);
    assert(!error, `connect failed: ${error?.reason}`);
    assert(el.shadowRoot === null, 'root should be closed');
    assert(refs?.label?.textContent === 'hi', 'closed root was not rendered and wired');
  });

  it('ui.container accepts a CSS file path as style', async () => {
    ui.container('test-container-file', {
      template: '<slot></slot>',
      style: './fixtures/container.css'
    }, import.meta.url);
    const el = document.createElement('test-container-file');
    el.setAttribute('name', 'test-container-file');
    host.appendChild(el);
    await wait(50);
    for (let i = 0; i < 20 && !getComputedStyle(el).getPropertyValue('--container-fixture'); i++) {
      await wait(20);
    }
    const style = getComputedStyle(el);
    assert(style.getPropertyValue('--container-fixture').trim() === 'loaded', 'container CSS file was not applied');
    assert(style.display === 'block', `container default display missing: ${style.display}`);
    assert(style.contain.includes('layout'), `container contain missing: ${style.contain}`);
  });

  it('dispatches anza:ready after an async mount settles', async () => {
    const order = [];
    let release;
    ui.element('test-ready-order', {
      template: '<span></span>',
      async mount() {
        order.push('mount:start');
        await new Promise((resolve) => { release = resolve; });
        order.push('mount:end');
      }
    });
    const el = document.createElement('test-ready-order');
    el.addEventListener('anza:ready', () => order.push('ready'));
    host.appendChild(el);
    await wait();
    let waited = false;
    waitForPageReady(el).then(() => { waited = true; });
    await wait();
    assert(!order.includes('ready'), `ready fired before mount settled: ${order.join(',')}`);
    assert(!waited, 'waitForPageReady resolved before mount settled');
    release();
    await wait();
    assert(order.join(',') === 'mount:start,mount:end,ready', order.join(','));
    assert(waited, 'waitForPageReady did not resolve after ready');
  });
});
