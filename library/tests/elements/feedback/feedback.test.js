/**
 * tests/elements/feedback/feedback.test.js
 *
 * Feedback Custom Elements test suite (<ui-alert>, <ui-empty>, <ui-progress>, <ui-skeleton>, <ui-toast>).
 */

import '../../../src/elements/feedback/alert/index.js';
import '../../../src/elements/feedback/empty/index.js';
import '../../../src/elements/feedback/progress/index.js';
import '../../../src/elements/feedback/skeleton/index.js';
import { show as showToast } from '../../../src/elements/feedback/toast/index.js';

describe('Feedback Custom Elements Suite', () => {
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

  describe('<ui-alert>', () => {
    it('should render alert and handle dismiss click', async () => {
      const alert = document.createElement('ui-alert');
      alert.variant = 'warning';
      alert.dismissible = true;
      container.appendChild(alert);
      await waitForShadow(alert);

      let dismissed = false;
      alert.addEventListener('dismiss', () => {
        dismissed = true;
      });

      const closeBtn = alert.shadowRoot?.querySelector('button');
      if (closeBtn) {
        closeBtn.click();
        if (!dismissed) {
          throw new Error('Expected dismiss event on close button click');
        }
      }
    });
  });

  describe('<ui-empty>', () => {
    it('should display custom title and description', async () => {
      const empty = document.createElement('ui-empty');
      empty.title = 'No Items';
      empty.description = 'Your cart is empty';
      container.appendChild(empty);
      await waitForShadow(empty);

      const titleEl = empty.shadowRoot?.querySelector('#title-label');
      const descEl = empty.shadowRoot?.querySelector('#desc-label');

      if (!titleEl || titleEl.textContent !== 'No Items') {
        throw new Error(`Expected title "No Items", got "${titleEl?.textContent}"`);
      }
      if (!descEl || descEl.textContent !== 'Your cart is empty') {
        throw new Error(`Expected description "Your cart is empty", got "${descEl?.textContent}"`);
      }
    });
  });

  describe('<ui-progress>', () => {
    it('should compute percentage and set aria attributes', async () => {
      const progress = document.createElement('ui-progress');
      progress.value = 50;
      progress.max = 200;
      container.appendChild(progress);
      await waitForShadow(progress);

      const label = progress.shadowRoot?.querySelector('#percent-label');
      if (!label || label.textContent !== '25%') {
        throw new Error(`Expected percentage label "25%", got "${label?.textContent}"`);
      }
      if (progress.getAttribute('aria-valuenow') !== '50') {
        throw new Error(`Expected aria-valuenow="50", got "${progress.getAttribute('aria-valuenow')}"`);
      }
    });
  });

  describe('<ui-skeleton>', () => {
    it('should apply dimensions and have aria-hidden', async () => {
      const skeleton = document.createElement('ui-skeleton');
      skeleton.width = '120px';
      skeleton.height = '24px';
      container.appendChild(skeleton);
      await waitForShadow(skeleton);

      if (skeleton.getAttribute('aria-hidden') !== 'true') {
        throw new Error('Expected aria-hidden="true" on skeleton');
      }
      if (skeleton.style.getPropertyValue('--skeleton-width') !== '120px') {
        throw new Error('Expected --skeleton-width style property to be 120px');
      }
    });
  });

  describe('<ui-toast>', () => {
    it('should display toast notification via show() helper', async () => {
      const toastEl = showToast('Operation completed successfully', { duration: 500 });
      if (!toastEl) {
        throw new Error('Expected toast element from show()');
      }
      await waitForShadow(toastEl);
      if (!toastEl.textContent.includes('Operation completed successfully')) {
        throw new Error('Expected toast text content to match');
      }
    });
  });
});
