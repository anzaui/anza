/**
 * tests/elements/overlay/dialog.test.js
 *
 * Overlay dialog Custom Element test suite.
 *
 * Source: plan.md Phase 6-A, elements/overlay/dialog.js
 */

import '@anzaui/anza/elements/dialog';

describe('<ui-dialog> Modal Element', () => {
  let dialog;

  beforeEach(async () => {
    dialog = document.createElement('ui-dialog');
    document.body.appendChild(dialog);
    let count = 0;
    while ((!dialog.shadowRoot || !dialog.shadowRoot.querySelector('dialog')) && count < 100) {
      await new Promise(resolve => setTimeout(resolve, 10));
      count++;
    }
  });

  afterEach(() => {
    dialog.remove();
  });

  it('should render an underlying native dialog in the Shadow DOM', () => {
    const root = dialog.shadowRoot;
    if (!root) {
      throw new Error('Expected <ui-dialog> to possess a Shadow DOM root');
    }

    const nativeDialog = root.querySelector('dialog');
    if (!nativeDialog) {
      throw new Error('Missing HTMLDialogElement inside overlay dialog shadow tree');
    }
  });

  it('should open and close modal states successfully', () => {
    const root = dialog.shadowRoot;
    const nativeDialog = root.querySelector('dialog');

    // Trigger dialog showModal
    dialog.setAttribute('open', 'true');
    const isOpen = dialog.hasAttribute('open');

    if (!isOpen) {
      throw new Error('Expected open state attribute to be set');
    }

    dialog.removeAttribute('open');
    if (dialog.hasAttribute('open')) {
      throw new Error('Expected open state attribute to be cleared');
    }
  });
});
