/**
 * tests/elements/layout/layout.test.js
 *
 * Layout Custom Elements test suite (<ui-app>, <ui-grid>, <ui-header>, <ui-scroll>, <ui-sidebar>, <ui-split>, <ui-stack>, <ui-surface>).
 */

import '../../../src/elements/layout/app/index.js';
import '../../../src/elements/layout/grid/index.js';
import '../../../src/elements/layout/header/index.js';
import '../../../src/elements/layout/scroll/index.js';
import '../../../src/elements/layout/sidebar/index.js';
import '../../../src/elements/layout/split/index.js';
import '../../../src/elements/layout/stack/index.js';
import '../../../src/elements/layout/surface/index.js';

describe('Layout Custom Elements Suite', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  async function waitForShadow(el) {
    let count = 0;
    while ((!el.shadowRoot || !el.shadowRoot.innerHTML) && count < 100) {
      await new Promise(resolve => setTimeout(resolve, 10));
      count++;
    }
  }

  describe('<ui-app>', () => {
    it('should render application frame with shadow DOM', async () => {
      const app = document.createElement('ui-app');
      container.appendChild(app);
      await waitForShadow(app);

      if (!app.shadowRoot) {
        throw new Error('Expected <ui-app> to have a Shadow Root');
      }
    });
  });

  describe('<ui-grid>', () => {
    it('should configure CSS variables for cols and gap', async () => {
      const grid = document.createElement('ui-grid');
      grid.cols = '3';
      grid.gap = '4';
      container.appendChild(grid);
      await waitForShadow(grid);

      if (grid.style.getPropertyValue('--grid-cols') !== 'repeat(3, minmax(0, 1fr))') {
        throw new Error(`Expected --grid-cols to be repeat(3, minmax(0, 1fr)), got "${grid.style.getPropertyValue('--grid-cols')}"`);
      }
      if (grid.style.getPropertyValue('--grid-gap') !== 'var(--space-4)') {
        throw new Error(`Expected --grid-gap to be var(--space-4), got "${grid.style.getPropertyValue('--grid-gap')}"`);
      }
    });
  });

  describe('<ui-stack>', () => {
    it('should configure CSS variables for gap', async () => {
      const stack = document.createElement('ui-stack');
      stack.gap = '2';
      container.appendChild(stack);
      await waitForShadow(stack);

      if (stack.style.getPropertyValue('--stack-gap') !== 'var(--space-2)') {
        throw new Error(`Expected --stack-gap to be var(--space-2), got "${stack.style.getPropertyValue('--stack-gap')}"`);
      }
    });
  });

  describe('<ui-split>', () => {
    it('should reflect ratio property', async () => {
      const split = document.createElement('ui-split');
      split.ratio = '2-1';
      container.appendChild(split);
      await waitForShadow(split);

      if (split.getAttribute('ratio') !== '2-1') {
        throw new Error(`Expected ratio attribute "2-1", got "${split.getAttribute('ratio')}"`);
      }
    });
  });

  describe('<ui-surface>', () => {
    it('should reflect variant property', async () => {
      const surface = document.createElement('ui-surface');
      surface.variant = 'elevated';
      container.appendChild(surface);
      await waitForShadow(surface);

      if (surface.getAttribute('variant') !== 'elevated') {
        throw new Error(`Expected variant attribute "elevated", got "${surface.getAttribute('variant')}"`);
      }
    });
  });
});
