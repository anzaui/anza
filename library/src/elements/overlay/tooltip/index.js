/**
 * src/elements/overlay/tooltip/index.js
 *
 * Overlay System: <ui-tooltip>
 * Accessible tooltip indicator. Wraps content and shows a hint on hover /
 * focus-within. Uses the platform escape/position helper so the tip can leave
 * overflow:hidden ancestors via Popover top-layer (or fixed fallback).
 *
 * Source: doc 04 — Web Components §3, doc 05 — Native UI Primitives §5
 */

import { ui } from '../../../core/ui/index.js';
import { guard } from '../../../core/platform/index.js';

ui.element('ui-tooltip', {
  style: './style.css',
  template: './index.html',
  props: {
    placement: { type: String, reflect: true, default: 'top' }
  },
  mount({ el, tags, on }) {
    const wrapper = tags.one('.wrapper');
    const tip = tags.one('.tooltip');

    if (!tip.hasAttribute('popover')) {
      tip.setAttribute('popover', 'manual');
    }

    /** @type {Awaited<ReturnType<typeof guard.escape>> | null} */
    let controller = null;
    let lastPlacement = null;
    /** @type {Promise<Awaited<ReturnType<typeof guard.escape>>> | null} */
    let pending = null;

    async function ensure() {
      const placement = el.placement || 'top';
      if (controller && lastPlacement === placement) return controller;
      if (pending) return pending;

      controller?.release();
      controller = null;
      lastPlacement = placement;

      pending = guard.escape(tip, wrapper, {
        placement,
        offset: 8,
        signal: el.ctrl.signal
      }).then((c) => {
        controller = c;
        pending = null;
        return c;
      });
      return pending;
    }

    async function show() {
      if (el.ctrl.signal.aborted) return;
      const c = await ensure();
      if (el.ctrl.signal.aborted) return;
      c.show();
    }

    function hide() {
      controller?.hide();
    }

    wrapper.addEventListener('pointerenter', () => {
      show();
    }, { signal: el.ctrl.signal });
    wrapper.addEventListener('pointerleave', () => {
      hide();
    }, { signal: el.ctrl.signal });
    // focusin/focusout bubble — safe via delegated `on`
    on.focusin(wrapper, () => {
      show();
    });
    on.focusout(wrapper, (e) => {
      const related = e.relatedTarget;
      if (related && (wrapper.contains(related) || tip.contains(related))) {
        return;
      }
      hide();
    });

    el.ctrl.signal.addEventListener('abort', () => {
      controller?.release();
      controller = null;
    }, { once: true });
  }
}, import.meta.url);
