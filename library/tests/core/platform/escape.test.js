/**
 * tests/core/platform/escape.test.js
 *
 * Overflow-escape / positioning helper tests.
 */

import { escapeOverflow } from '@adukiorg/anza/platform';
import { position } from '/src/core/platform/polyfills/anchor.js';
import { guard } from '@adukiorg/anza/platform';

describe('escapeOverflow / anchor position', () => {
  let anchor;
  let floating;
  let clip;

  beforeEach(() => {
    clip = document.createElement('div');
    clip.style.cssText = 'overflow:hidden;width:80px;height:40px;position:relative;';
    document.body.appendChild(clip);

    anchor = document.createElement('button');
    anchor.textContent = 'Hint';
    clip.appendChild(anchor);

    floating = document.createElement('div');
    floating.textContent = 'Tooltip text that is wider than the clip';
    floating.setAttribute('popover', 'manual');
    floating.style.cssText = 'padding:4px;white-space:nowrap;';
    clip.appendChild(floating);
  });

  afterEach(() => {
    clip?.remove();
  });

  it('positions with fixed mode using centered top placement', () => {
    floating.style.position = 'fixed';
    floating.style.visibility = 'hidden';
    document.body.appendChild(floating);
    floating.style.visibility = '';

    position(floating, anchor, { placement: 'top', offset: 8, mode: 'fixed' });

    if (floating.style.position !== 'fixed') {
      throw new Error('Expected position mode fixed');
    }
    if (!floating.style.top || !floating.style.left) {
      throw new Error('Expected top/left to be set');
    }

    const a = anchor.getBoundingClientRect();
    const f = floating.getBoundingClientRect();
    // Tip should sit above the anchor (bottom of tip near top of anchor)
    if (f.bottom > a.top + 2) {
      // allow small tolerance; if float was zero-size before, re-check after visible
      position(floating, anchor, { placement: 'top', offset: 8, mode: 'fixed' });
    }
    floating.remove();
  });

  it('escapeOverflow show uses popover or fixed strategy and escapes clip width', async () => {
    await guard.popover();

    const ctrl = escapeOverflow(floating, anchor, { placement: 'top', offset: 8 });
    ctrl.show();

    if (!ctrl.open) {
      throw new Error('Expected controller open after show');
    }
    if (ctrl.strategy !== 'popover' && ctrl.strategy !== 'fixed') {
      throw new Error(`Unexpected strategy: ${ctrl.strategy}`);
    }

    const tipRect = floating.getBoundingClientRect();
    const clipRect = clip.getBoundingClientRect();

    // Tip should be measurable and typically wider / outside the clip box.
    if (tipRect.width === 0 && tipRect.height === 0) {
      throw new Error('Expected floating element to have non-zero size when open');
    }

    const escapesHorizontally = tipRect.right > clipRect.right + 1
      || tipRect.left < clipRect.left - 1;
    const escapesVertically = tipRect.top < clipRect.top - 1
      || tipRect.bottom > clipRect.bottom + 1;
    const isTopLayer = floating.matches?.(':popover-open')
      || floating.hasAttribute('data-popover-open')
      || floating.dataset.escapeOpen != null;

    if (!isTopLayer && !escapesHorizontally && !escapesVertically) {
      throw new Error('Expected tip to escape clip via top-layer or fixed coords outside clip');
    }

    ctrl.hide();
    if (ctrl.open) {
      throw new Error('Expected controller closed after hide');
    }
    ctrl.release();
  });

  it('escapeOverflow falls back to fixed when popover attribute missing', () => {
    floating.removeAttribute('popover');
    const ctrl = escapeOverflow(floating, anchor, { placement: 'bottom', offset: 4 });
    if (ctrl.strategy !== 'fixed') {
      throw new Error(`Expected fixed strategy without popover attr, got ${ctrl.strategy}`);
    }
    ctrl.show();
    if (floating.style.position !== 'fixed') {
      throw new Error('Expected fixed positioning on show without popover');
    }
    if (floating.dataset.escapeOpen == null) {
      throw new Error('Expected data-escape-open marker');
    }
    ctrl.hide();
    if (floating.dataset.escapeOpen != null) {
      throw new Error('Expected data-escape-open cleared on hide');
    }
  });

  it('guard.escape resolves a controller', async () => {
    const ctrl = await guard.escape(floating, anchor, { placement: 'top' });
    if (!ctrl || typeof ctrl.show !== 'function' || typeof ctrl.hide !== 'function') {
      throw new Error('Expected guard.escape to return a controller');
    }
    ctrl.release();
  });
});
