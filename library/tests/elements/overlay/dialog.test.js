/**
 * tests/elements/overlay/dialog.test.js
 *
 * <ui-dialog>: the `open` attribute/property and showModal()/close() stay
 * in sync with the native modal <dialog>.
 */

import '@anzaui/anza/elements/dialog';

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

/** Resolves on the native dialog's next `close` event (queued as a task). */
function closeOf(native) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('native close event never fired')), 1500);
    native.addEventListener('close', () => { clearTimeout(timer); resolve(); }, { once: true });
  });
}

async function mounted(el) {
  for (let i = 0; i < 200 && !el._ctx; i++) await tick(10);
  if (!el._ctx) throw new Error('ui-dialog never mounted');
}

describe('<ui-dialog> Modal Element', () => {
  let dialog;
  let native;

  beforeEach(async () => {
    dialog = document.createElement('ui-dialog');
    document.body.appendChild(dialog);
    await mounted(dialog);
    native = dialog.shadowRoot.querySelector('dialog');
  });

  afterEach(() => {
    dialog.remove();
  });

  it('should render an underlying native dialog in the Shadow DOM', () => {
    if (!native) throw new Error('Missing HTMLDialogElement inside overlay dialog shadow tree');
  });

  it('setting the open attribute opens the modal and removing it closes it', async () => {
    const shown = [];
    const closed = [];
    dialog.addEventListener('show', () => shown.push(1));
    dialog.addEventListener('close', () => closed.push(1));
    dialog.setAttribute('open', '');
    await tick();
    if (!native.open) throw new Error('open attribute did not open the dialog');
    if (!native.matches(':modal')) throw new Error('dialog was not opened as a modal');
    if (shown.length !== 1) throw new Error(`show fired ${shown.length} times`);
    const done = closeOf(native);
    dialog.removeAttribute('open');
    await done;
    await tick();
    if (native.open) throw new Error('removing open did not close the dialog');
    if (closed.length !== 1) throw new Error(`close fired ${closed.length} times`);
  });

  it('the open property opens and closes the modal', async () => {
    dialog.open = true;
    await tick();
    if (!native.open || !native.matches(':modal')) throw new Error('open = true did not open a modal');
    const done = closeOf(native);
    dialog.open = false;
    await done;
    if (native.open) throw new Error('open = false did not close the dialog');
  });

  it('showModal() and close() keep the attribute in sync', async () => {
    dialog.showModal();
    if (!native.open || !dialog.hasAttribute('open')) throw new Error('showModal() out of sync');
    const done = closeOf(native);
    dialog.close('ok');
    await done;
    await tick();
    if (native.open || dialog.hasAttribute('open')) throw new Error('close() out of sync');
    if (native.returnValue !== 'ok') throw new Error(`returnValue ${native.returnValue}`);
  });

  it('a native close (Escape path) clears the attribute', async () => {
    dialog.showModal();
    const done = closeOf(native);
    native.close();
    await done;
    await tick();
    if (dialog.hasAttribute('open') || dialog.open) throw new Error('native close left open set');
  });

  it('opens on connect when open is in the markup', async () => {
    const host = document.createElement('div');
    host.innerHTML = '<ui-dialog open>hi</ui-dialog>';
    document.body.appendChild(host);
    const el = host.firstElementChild;
    try {
      await mounted(el);
      await tick();
      const inner = el.shadowRoot.querySelector('dialog');
      if (!inner.open || !inner.matches(':modal')) throw new Error('markup open did not open a modal');
    } finally {
      host.remove();
    }
  });
});
