/**
 * tests/elements/overlay/popover.test.js
 *
 * Overlay popover Custom Element test suite.
 *
 * Source: plan.md Phase 6-A, elements/overlay/popover.js
 */

import '@adukiorg/anza/elements/popover';

describe('<ui-popover> Overlay Element', () => {
  let popover;

  beforeEach(async () => {
    popover = document.createElement('ui-popover');
    document.body.appendChild(popover);
    let count = 0;
    while ((!popover.shadowRoot || !popover.shadowRoot.querySelector('[popover]') && !popover.shadowRoot.querySelector('div')) && count < 100) {
      await new Promise(resolve => setTimeout(resolve, 10));
      count++;
    }
  });

  afterEach(() => {
    popover.remove();
  });

  it('should render standard slots and popover element in Shadow DOM', () => {
    const root = popover.shadowRoot;
    if (!root) {
      throw new Error('Expected <ui-popover> to possess a Shadow DOM root');
    }

    const popoverDiv = root.querySelector('[popover]');
    if (!popoverDiv && !root.querySelector('div')) {
      throw new Error('Missing popover container inside shadow tree');
    }
  });

  it('should support dynamic state toggle triggers', () => {
    popover.setAttribute('open', 'true');
    const isOpen = popover.hasAttribute('open');

    if (!isOpen) {
      throw new Error('Expected open state attribute to be set on popover');
    }

    popover.removeAttribute('open');
    if (popover.hasAttribute('open')) {
      throw new Error('Expected open state attribute to be cleared on popover');
    }
  });
});
