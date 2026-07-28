/**
 * tests/core/router/container.test.js
 *
 * Test suite for router container registry.
 */

import {
  registerContainer,
  unregisterContainer,
  getContainer,
  clearContainers,
  getNode
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

  it('registers containers with separate name and tag', () => {
    const dockEl = document.createElement('div');
    registerContainer('docs', dockEl, 'main', 'dock-docs');

    const node = getNode('docs');
    if (!node) {
      throw new Error('Expected node to exist');
    }
    if (node.name !== 'docs') {
      throw new Error(`Expected node.name to be 'docs', got '${node.name}'`);
    }
    if (node.tag !== 'dock-docs') {
      throw new Error(`Expected node.tag to be 'dock-docs', got '${node.tag}'`);
    }

    const retrieved = getContainer('docs');
    if (retrieved !== dockEl) {
      throw new Error('Expected retrieved container to match registered element');
    }
  });

  it('defaults tag to name when not provided', () => {
    const dockEl = document.createElement('div');
    registerContainer('sidebar', dockEl, 'main');

    const node = getNode('sidebar');
    if (!node) {
      throw new Error('Expected node to exist');
    }
    if (node.tag !== 'sidebar') {
      throw new Error(`Expected node.tag to default to 'sidebar', got '${node.tag}'`);
    }
  });

  it('container selector MO registers via globals and disconnects when satisfied', async () => {
    const { getContainer: getBySelector, clearContainers: clearAll } = await import(
      '../../../src/core/router/container.js'
    );
    // Re-import globals + waitFor path: calling getContainer with a missing selector
    // schedules ensureObserver. Use a unique selector under #main.
    const { globals } = await import('../../../src/core/platform/globals.js');

    const before = globals.count();
    // Trigger wait path — selector not yet in DOM.
    getBySelector('#soft-container-mo-target');

    await new Promise((r) => setTimeout(r, 150));

    const waiting = globals.list().some((e) => e.name === 'router.container-mo');
    // Observer may attach after idle callback; if main exists it should appear.
    if (!waiting && globals.count() === before) {
      // Some environments may not have scheduled yet — force another lookup after tick.
      getBySelector('#soft-container-mo-target');
      await new Promise((r) => setTimeout(r, 150));
    }

    if (!globals.list().some((e) => e.name === 'router.container-mo')) {
      throw new Error('Expected router.container-mo global while waiting for selector');
    }

    const target = document.createElement('div');
    target.id = 'soft-container-mo-target';
    mainEl.appendChild(target);

    await new Promise((r) => setTimeout(r, 50));

    if (getBySelector('#soft-container-mo-target') !== target) {
      throw new Error('Expected MO to register discovered container');
    }
    if (globals.list().some((e) => e.name === 'router.container-mo')) {
      throw new Error('Expected container MO global detached once selectors satisfied');
    }

    clearAll();
  });
});
