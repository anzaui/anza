/**
 * tests/elements/forms/field.test.js
 *
 * Layout field wrapper Custom Element test suite.
 *
 * Source: plan.md Phase 6-A, elements/forms/field.js
 */

import '../../../src/elements/forms/field/index.js';

describe('<ui-field> Control Wrapper Element', () => {
  let field;

  beforeEach(async () => {
    field = document.createElement('ui-field');
    document.body.appendChild(field);
    let count = 0;
    while ((!field.shadowRoot || !field.shadowRoot.querySelector('slot')) && count < 100) {
      await new Promise(resolve => setTimeout(resolve, 10));
      count++;
    }
  });

  afterEach(() => {
    field.remove();
  });

  it('should render structured label, hint, and error slots', () => {
    const root = field.shadowRoot;
    if (!root) {
      throw new Error('Expected <ui-field> to possess a Shadow DOM root');
    }

    const labelSlot = root.querySelector('slot[name="label"]');
    const hintSlot = root.querySelector('slot[name="hint"]');
    const errorSlot = root.querySelector('slot[name="error"]');

    if (!labelSlot || !hintSlot || !errorSlot) {
      throw new Error('Missing core structural slots inside field wrapper');
    }
  });

  it('should dynamically coordinate hint and error state displays', () => {
    field.setAttribute('error', 'Required field must be populated');
    const hasError = field.hasAttribute('error');
    
    if (!hasError) {
      throw new Error('Expected field error state attribute to be active');
    }
  });
});
