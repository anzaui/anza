/**
 * tests/core/ui/soft-nav.test.js
 *
 * Phase 2 client navigations: full load adopts SSG leaf DSD; soft-nav CSR-swaps
 * only the leaf page; cascade must not wipe pre-rendered docks.
 */

import { ui } from '../../../src/core/ui/index.js';
import { router } from '../../../src/core/router/index.js';
import { emit } from '../../../src/core/router/intercept.js';
import { ensure } from '../../../src/core/router/cascade.js';
import { clear as clearGraph, get as getNode } from '../../../src/core/router/graph.js';

function wait(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createWithDsd(tag, markup) {
  const el = document.createElement(tag);
  const shadow = el.attachShadow({ mode: 'open' });
  shadow.innerHTML = markup;
  return el;
}

describe('Client soft-nav vs SSG adopt', () => {
  let shell;
  let mainEl;
  let leafDock;

  beforeEach(() => {
    shell = document.getElementById('main');
    if (shell) shell.remove();

    mainEl = document.createElement('main');
    mainEl.id = 'main';
    document.body.appendChild(mainEl);

    leafDock = document.createElement('div');
    leafDock.id = 'soft-leaf';
    mainEl.appendChild(leafDock);

    router.clear();
    router.clearContainers();
    router.registerContainer('main', mainEl, null);
    router.registerContainer('soft-leaf', leafDock, 'main');
  });

  afterEach(() => {
    router.clear();
    router.clearContainers();
    if (mainEl) {
      mainEl.remove();
      mainEl = null;
    }
    leafDock = null;
    if (shell) {
      document.body.appendChild(shell);
      shell = null;
    }
  });

  it('reuses SSG leaf of matching tag on found/load (no DSD wipe)', async () => {
    const tag = 'doc-soft-ssg-leaf';
    const pageEl = createWithDsd(tag, '<h1 id="ssg-h1">From SSG</h1>');
    leafDock.appendChild(pageEl);

    ui.element(tag, {
      via: ['main', 'soft-leaf'],
      container: 'soft-leaf',
      template: '<h1 id="csr-h1">From CSR</h1>'
    });

    emit('found', {
      tag,
      params: {},
      query: {},
      hash: '',
      chain: [{ tag, params: {} }],
      via: ['main', 'soft-leaf'],
      container: 'soft-leaf',
      url: 'http://localhost/soft-ssg',
      direction: 'load'
    });
    await wait(30);

    const mounted = leafDock.querySelector(tag);
    if (mounted !== pageEl) {
      throw new Error('Expected orchestrator to reuse the SSG leaf instance');
    }
    if (!mounted.classList.contains('page-content')) {
      throw new Error('Expected reused leaf to gain .page-content marker');
    }
    if (!mounted.shadowRoot?.querySelector('#ssg-h1')) {
      throw new Error('Expected adopted DSD content to survive found/load');
    }
    if (mounted.shadowRoot.querySelector('#csr-h1')) {
      throw new Error('Expected CSR template NOT to replace adopted DSD on load');
    }
  });

  it('soft-nav to a different leaf CSR-swaps page but keeps parent dock DSD', async () => {
    const dockTag = 'dock-soft-parent';
    const pageA = 'doc-soft-page-a';
    const pageB = 'doc-soft-page-b';

    // Attach open DSD before define so upgrade adopts (same as SSG parse).
    const dockEl = createWithDsd(
      dockTag,
      '<div id="dock-chrome">chrome</div><slot></slot>'
    );
    const leafA = createWithDsd(pageA, '<p id="a-body">A</p>');
    leafA.classList.add('page-content');
    dockEl.appendChild(leafA);
    mainEl.replaceChildren(dockEl);

    ui.dock('soft-parent', {
      parent: 'main',
      tag: dockTag,
      template: '<div id="dock-chrome">chrome</div><slot></slot>'
    });
    await customElements.whenDefined(dockTag);
    await wait(30);
    router.registerContainer('soft-parent', dockEl, 'main', dockTag);

    ui.element(pageA, {
      via: ['main', 'soft-parent'],
      container: 'soft-parent',
      template: '<p id="a-csr">A</p>'
    });
    ui.element(pageB, {
      via: ['main', 'soft-parent'],
      container: 'soft-parent',
      template: '<p id="b-csr">B</p>'
    });

    emit('found', {
      tag: pageB,
      params: {},
      query: {},
      hash: '',
      chain: [{ tag: pageB, params: {} }],
      via: ['main', 'soft-parent'],
      container: 'soft-parent',
      url: 'http://localhost/soft-b',
      direction: 'push'
    });
    await wait(40);

    if (mainEl.querySelector(dockTag) !== dockEl) {
      throw new Error('Expected parent dock element to stay mounted across soft-nav');
    }
    if (!dockEl.shadowRoot?.querySelector('#dock-chrome')) {
      throw new Error('Expected parent dock adopted DSD chrome to survive soft-nav');
    }
    if (dockEl.querySelector(pageA)) {
      throw new Error('Expected previous leaf to be swapped out');
    }
    const leafB = dockEl.querySelector(pageB);
    if (!leafB?.classList.contains('page-content')) {
      throw new Error('Expected new CSR leaf with .page-content');
    }
    await wait(20);
    if (!leafB.shadowRoot?.querySelector('#b-csr')) {
      throw new Error('Expected soft-nav leaf to CSR-mount client template');
    }
  });

  it('cascade ensure adopts pre-rendered dock child without wiping nested markers', async () => {
    clearGraph();
    router.registerContainer('main', mainEl, null);

    const dockTag = 'dock-soft-cascade';
    ui.dock('soft-cascade', {
      parent: 'main',
      tag: dockTag,
      template: '<slot></slot>'
    });
    await customElements.whenDefined(dockTag);

    const nested = document.createElement('span');
    nested.id = 'nested-ssg-marker';
    nested.textContent = 'keep';

    const dockEl = document.createElement(dockTag);
    dockEl.appendChild(nested);
    mainEl.appendChild(dockEl);

    // Simulate registration race: topology exists, live ref cleared, DOM still present.
    await wait(30);
    const node = getNode('soft-cascade');
    if (node?.ref) node.ref = null;

    const sibling = document.createElement('em');
    sibling.id = 'sibling-keep';
    mainEl.insertBefore(sibling, dockEl);

    await ensure('soft-cascade', 'main');

    if (!mainEl.querySelector('#sibling-keep')) {
      throw new Error('Expected cascade adopt path not to replaceChildren over siblings');
    }
    if (!dockEl.querySelector('#nested-ssg-marker')) {
      throw new Error('Expected pre-rendered dock light-DOM content to survive ensure()');
    }
    if (router.getContainer('soft-cascade') !== dockEl) {
      throw new Error('Expected ensure() to re-point registry at the pre-rendered dock');
    }
  });
});
