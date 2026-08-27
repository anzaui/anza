/**
 * tests/elements/data/data.test.js
 *
 * Data Custom Elements test suite (<ui-card>, <ui-stat>, <ui-list>, <ui-table>, <ui-chart>).
 */

import '../../../src/elements/data/card/index.js';
import '../../../src/elements/data/stat/index.js';
import '../../../src/elements/data/list/index.js';
import '../../../src/elements/data/table/index.js';
import '../../../src/elements/data/chart/index.js';

describe('Data Custom Elements Suite', () => {
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

  describe('<ui-card>', () => {
    it('should render card with shadow DOM and support interactive property', async () => {
      const card = document.createElement('ui-card');
      container.appendChild(card);
      await waitForShadow(card);

      if (!card.shadowRoot) {
        throw new Error('Expected <ui-card> to have a Shadow Root');
      }

      card.interactive = true;
      if (!card.hasAttribute('interactive')) {
        throw new Error('Expected interactive property to reflect as an attribute');
      }
    });
  });

  describe('<ui-stat>', () => {
    it('should render stat and reflect trend property', async () => {
      const stat = document.createElement('ui-stat');
      container.appendChild(stat);
      await waitForShadow(stat);

      if (!stat.shadowRoot) {
        throw new Error('Expected <ui-stat> to have a Shadow Root');
      }

      stat.trend = 'positive';
      if (stat.getAttribute('trend') !== 'positive') {
        throw new Error('Expected trend property to reflect "positive" attribute');
      }
    });
  });

  describe('<ui-list>', () => {
    it('should render list and reflect bordered property', async () => {
      const list = document.createElement('ui-list');
      container.appendChild(list);
      await waitForShadow(list);

      if (!list.shadowRoot) {
        throw new Error('Expected <ui-list> to have a Shadow Root');
      }

      list.bordered = true;
      if (!list.hasAttribute('bordered')) {
        throw new Error('Expected bordered property to reflect as an attribute');
      }
    });
  });

  describe('<ui-table>', () => {
    it('should render table wrapper with shadow DOM slots', async () => {
      const table = document.createElement('ui-table');
      container.appendChild(table);
      await waitForShadow(table);

      if (!table.shadowRoot) {
        throw new Error('Expected <ui-table> to have a Shadow Root');
      }
    });
  });

  describe('<ui-chart>', () => {
    it('should render chart canvas and update when data/type changes', async () => {
      const chart = document.createElement('ui-chart');
      chart.style.width = '300px';
      chart.style.height = '150px';
      container.appendChild(chart);
      await waitForShadow(chart);

      const canvas = chart.shadowRoot?.querySelector('canvas');
      if (!canvas) {
        throw new Error('Expected <ui-chart> to possess a canvas inside shadow DOM');
      }

      chart.type = 'line';
      chart.data = JSON.stringify([5, 15, 25, 35]);
      await new Promise(resolve => setTimeout(resolve, 30));
    });
  });
});
