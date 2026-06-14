/**
 * tests/core/router/container.test.js
 *
 * Test suite for router container registry.
 */

import {
  registerContainer,
  unregisterContainer,
  getContainer,
  clearContainers
} from '../../../src/core/router/container.js';

describe('Router Container Registry', () => {
  let el;
  let mainEl;

  let shell;

  beforeEach(() => {
    // Save and remove the test runner's main element to avoid collision.
    shell = document.getElementById('main');
    if (shell) {
      shell.remove();
    }

    // Framework requires <main id="main"> in the document.
    mainEl = document.createElement('main');
    mainEl.id = 'main';
    document.body.appendChild(mainEl);

    el = document.createElement('div');
    el.id = 'main-content';
    mainEl.appendChild(el);
  });

  afterEach(() => {
    mainEl.remove();
    mainEl = null;
    el = null;
    clearContainers();

    // Restore the test runner's main element.
    if (shell) {
      document.body.appendChild(shell);
      shell = null;
    }
  });

  it('registers and retrieves containers by name', () => {
    registerContainer('app-main', el);
    const retrieved = getContainer('app-main');

    if (retrieved !== el) {
      throw new Error('Expected retrieved container to match registered element');
    }
  });

  it('throws on duplicate container registrations', () => {
    registerContainer('app-main', el);
    let threw = false;

    try {
      registerContainer('app-main', document.createElement('div'));
    } catch (err) {
      threw = true;
    }

    if (!threw) {
      throw new Error('Expected duplicate registration to throw');
    }
  });

  it('unregisters container and ignores non-matching element names', () => {
    registerContainer('app-main', el);
    unregisterContainer('other');

    if (getContainer('app-main') !== el) {
      throw new Error('Expected app-main to remain registered');
    }

    unregisterContainer('app-main');
    if (getContainer('app-main')) {
      throw new Error('Expected app-main to be unregistered');
    }
  });

  it('resolves active elements via CSS selector fallback', () => {
    const retrieved = getContainer('#main-content');
    if (retrieved !== el) {
      throw new Error('Expected CSS selector fallback to resolve element');
    }
  });

  it('ignores invalid query selectors safely and returns null or undefined', () => {
    const invalid = getContainer(':::invalid-selector');
    if (invalid) {
      throw new Error('Expected invalid selector to return falsy value without throwing');
    }
  });

  it('clears container registry', () => {
    registerContainer('app-main', el);
    clearContainers();

    if (getContainer('app-main')) {
      throw new Error('Expected container map to be empty after clearContainers');
    }
  });
});
