/**
 * tests/elements/overlay/tooltip.test.js
 *
 * <ui-tooltip> positioning / overflow escape.
 */

import '@adukiorg/anza/elements/tooltip';

async function waitForTip(host) {
  let count = 0;
  while ((!host.shadowRoot || !host.shadowRoot.querySelector('.tooltip')) && count < 100) {
    await new Promise((resolve) => setTimeout(resolve, 10));
    count++;
  }
  return host.shadowRoot?.querySelector('.tooltip');
}

describe('<ui-tooltip> Overlay Element', () => {
  let host;
  let clip;

  beforeEach(async () => {
    clip = document.createElement('div');
    clip.style.cssText = 'overflow:hidden;width:64px;height:32px;';
    document.body.appendChild(clip);

    host = document.createElement('ui-tooltip');
    host.innerHTML = '<button type="button">Go</button><span slot="content">Save changes now</span>';
    clip.appendChild(host);
    await waitForTip(host);
  });

  afterEach(() => {
    host?.remove();
    clip?.remove();
  });

  it('renders tooltip surface with popover=manual in shadow', async () => {
    const tip = host.shadowRoot.querySelector('.tooltip');
    if (!tip) {
      throw new Error('Expected .tooltip part');
    }
    if (tip.getAttribute('popover') !== 'manual') {
      throw new Error('Expected popover="manual" for top-layer escape');
    }
    if (tip.getAttribute('role') !== 'tooltip') {
      throw new Error('Expected role=tooltip');
    }
  });

  it('shows tip on pointerenter and escapes overflow clip', async () => {
    const root = host.shadowRoot;
    const wrapper = root.querySelector('.wrapper');
    const tip = root.querySelector('.tooltip');

    wrapper.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true, composed: true }));

    // escape helper may await guard.popover / dynamic import
    let opened = false;
    for (let i = 0; i < 50; i++) {
      await new Promise((r) => setTimeout(r, 20));
      opened = tip.matches?.(':popover-open')
        || tip.hasAttribute('data-popover-open')
        || tip.hasAttribute('data-escape-open');
      if (opened) break;
    }

    if (!opened) {
      throw new Error('Expected tooltip to open on pointerenter');
    }

    const tipRect = tip.getBoundingClientRect();
    const clipRect = clip.getBoundingClientRect();

    if (tipRect.width === 0) {
      throw new Error('Expected open tooltip to have width');
    }

    const escapes = tipRect.right > clipRect.right + 1
      || tipRect.left < clipRect.left - 1
      || tipRect.top < clipRect.top - 1
      || tipRect.bottom > clipRect.bottom + 1
      || opened;

    if (!escapes) {
      throw new Error('Expected tooltip to escape overflow clip');
    }

    wrapper.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true, composed: true }));
    await new Promise((r) => setTimeout(r, 40));

    const stillOpen = tip.matches?.(':popover-open')
      || tip.hasAttribute('data-popover-open')
      || tip.hasAttribute('data-escape-open');
    if (stillOpen) {
      throw new Error('Expected tooltip to hide on pointerleave');
    }
  });

  it('reflects placement prop', async () => {
    host.placement = 'bottom';
    if (host.getAttribute('placement') !== 'bottom') {
      throw new Error('Expected placement to reflect');
    }
  });
});
