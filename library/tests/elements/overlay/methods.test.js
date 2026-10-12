/**
 * tests/elements/overlay/methods.test.js
 *
 * E1: documented overlay methods work when called on the element
 * (spec.methods run with `this` bound to the element).
 */

import '../../../src/elements/overlay/dialog/index.js';
import '../../../src/elements/overlay/drawer/index.js';
import '../../../src/elements/overlay/sheet/index.js';
import '../../../src/elements/overlay/menu/index.js';
import '../../../src/elements/overlay/popover/index.js';
import '../../../src/elements/layout/sidebar/index.js';

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

async function mount(html, selector) {
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.appendChild(host);
  const el = host.firstElementChild;
  for (let i = 0; i < 200 && !(el.shadowRoot?.querySelector(selector) && el._ctx); i++) {
    await tick(10);
  }
  if (!el._ctx) throw new Error(`<${el.localName}> never mounted`);
  return el;
}

describe('Overlay element methods (E1)', () => {
  afterEach(() => {
    document.querySelectorAll('ui-dialog, ui-drawer, ui-sheet, ui-menu, ui-popover, ui-sidebar')
      .forEach((n) => n.parentElement.remove());
  });

  it('ui-dialog showModal() / close() open and close the native dialog', async () => {
    const el = await mount('<ui-dialog><p>Body</p></ui-dialog>', 'dialog');
    const dialog = el.shadowRoot.querySelector('dialog');
    let shown = 0;
    el.addEventListener('show', () => shown++);
    const closed = new Promise((resolve) => el.addEventListener('close', (e) => resolve(e.detail), { once: true }));

    el.showModal();
    if (!dialog.open || !dialog.matches(':modal')) throw new Error('dialog not modal after showModal()');
    if (!el.open || !el.hasAttribute('open')) throw new Error('open prop not set');
    if (shown !== 1) throw new Error('show event not dispatched');

    el.close('done');
    if (dialog.open) throw new Error('dialog still open after close()');
    if (el.open) throw new Error('open prop still set');
    const detail = await Promise.race([closed, tick(1000).then(() => null)]);
    if (!detail || detail.returnValue !== 'done') throw new Error(`close detail: ${JSON.stringify(detail)}`);
  });

  for (const tag of ['ui-drawer', 'ui-sheet']) {
    it(`${tag} show() / hide() toggle the native dialog`, async () => {
      const el = await mount(`<${tag}><p>Body</p></${tag}>`, 'dialog');
      const dialog = el.shadowRoot.querySelector('dialog');

      el.show();
      await tick(20);
      if (!el.open || !dialog.open) throw new Error('not open after show()');

      el.hide();
      if (el.open) throw new Error('open prop still set after hide()');
      await tick(400);
      if (dialog.open) throw new Error('dialog still open after hide() transition');
    });
  }

  it('ui-menu show() / hide() / toggle() drive the popover and focus the first item', async () => {
    const el = await mount('<ui-menu><button>One</button><button>Two</button></ui-menu>', '[popover]');
    const popover = el.shadowRoot.querySelector('[popover]');
    await tick(10);

    el.show();
    if (!popover.matches(':popover-open')) throw new Error('not open after show()');
    if (document.activeElement !== el.querySelector('button')) throw new Error('first item not focused');

    el.hide();
    if (popover.matches(':popover-open')) throw new Error('still open after hide()');

    el.toggle();
    if (!popover.matches(':popover-open')) throw new Error('toggle() did not open');
    el.toggle();
    if (popover.matches(':popover-open')) throw new Error('toggle() did not close');
  });

  it('ui-popover show() / hide() / toggle() drive the popover', async () => {
    const el = await mount('<ui-popover><p>Tip</p></ui-popover>', '[popover]');
    const popover = el.shadowRoot.querySelector('[popover]');

    el.show();
    if (!popover.matches(':popover-open')) throw new Error('not open after show()');
    el.hide();
    if (popover.matches(':popover-open')) throw new Error('still open after hide()');
    el.toggle();
    if (!popover.matches(':popover-open')) throw new Error('toggle() did not open');
    el.toggle();
    if (popover.matches(':popover-open')) throw new Error('toggle() did not close');
  });

  it('ui-sidebar toggle() flips collapsed', async () => {
    const el = await mount('<ui-sidebar></ui-sidebar>', 'slot');
    el.toggle();
    if (!el.collapsed || !el.hasAttribute('collapsed')) throw new Error('not collapsed');
    el.toggle();
    if (el.collapsed) throw new Error('still collapsed');
  });
});
