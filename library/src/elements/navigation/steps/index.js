/**
 * src/elements/navigation/steps/index.js
 *
 * Navigation System: <ui-steps>
 * Linear step indicator tracking completed, active, and upcoming workflow steps.
 *
 * Source: doc 04 — Web Components §3, doc 05 — Native UI Primitives §3
 */

import { ui } from '../../../core/ui/index.js';

ui.element('ui-steps', {
  style: './style.css',
  template: './index.html',
  props: {
    active: { type: Number, reflect: true }
  },
  mount({ el, tags, on }) {
    const slot = tags.one('slot');

    // A list of steps; the active one carries aria-current="step".
    if (!el.hasAttribute('role')) {
      el.setAttribute('role', 'list');
    }

    on.slotchange(slot, () => {
      const steps = getSteps(tags);
      steps.forEach((step, index) => {
        step.setAttribute('role', 'listitem');
        // Set numeric step labels inside nodes
        if (step.getAttribute('state') !== 'completed') {
          step.style.setProperty('--step-num', `"${index + 1}"`);
        }
      });
      update(el, tags);
    });

    update(el, tags);
  },
  update({ el, tags }) {
    update(el, tags);
  }
}, import.meta.url);

function getSteps(tags) {
  const slot = tags.one('slot');
  return slot.assignedElements();
}

function update(el, tags) {
  const steps = getSteps(tags);
  const active = el.active || 0;
  const lineFill = tags.one('.line-fill');

  if (steps.length === 0) return;

  steps.forEach((step, index) => {
    if (index < active) {
      step.setAttribute('state', 'completed');
    } else if (index === active) {
      step.setAttribute('state', 'active');
    } else {
      step.removeAttribute('state');
    }
    if (index === active) {
      step.setAttribute('aria-current', 'step');
    } else {
      step.removeAttribute('aria-current');
    }
  });

  const percent = steps.length > 1 ? (active / (steps.length - 1)) * 100 : 0;
  lineFill.style.width = `${percent}%`;
}
