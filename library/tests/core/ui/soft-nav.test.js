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

  it('does not adopt a deep nested matching tag as the leaf', async () => {
    const tag = 'doc-soft-deep-only';
    const wrapper = document.createElement('div');
    const deep = createWithDsd(tag, '<h1 id="deep-h1">Deep</h1>');
    wrapper.appendChild(deep);
    leafDock.appendChild(wrapper);

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
      url: 'http://localhost/soft-deep',
      direction: 'load'
    });
    await wait(30);

    const directLeaves = [...leafDock.children].filter(
      (el) => el.tagName.toLowerCase() === tag
    );
    if (directLeaves.length !== 1) {
      throw new Error('Expected exactly one direct-child leaf after found/load');
    }
    if (directLeaves[0] === deep) {
      throw new Error('Expected not to adopt the deep nested matching tag');
    }
    await wait(20);
    if (!directLeaves[0].shadowRoot?.querySelector('#csr-h1')) {
      throw new Error('Expected CSR mount of a new direct-child leaf');
    }
  });

  it('prefers a direct-child leaf over a deeper nested same tag', async () => {
    const tag = 'doc-soft-direct-vs-deep';
    const direct = createWithDsd(tag, '<h1 id="direct-h1">Direct</h1>');
    const wrapper = document.createElement('div');
    const deep = createWithDsd(tag, '<h1 id="deep-h1">Deep</h1>');
    wrapper.appendChild(deep);
    leafDock.appendChild(direct);
    leafDock.appendChild(wrapper);

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
      url: 'http://localhost/soft-direct',
      direction: 'load'
    });
    await wait(30);

    const mounted = [...leafDock.children].find((el) => el.tagName.toLowerCase() === tag);
    if (mounted !== direct) {
      throw new Error('Expected orchestrator to reuse the direct-child leaf, not the deep one');
    }
    if (!mounted.classList.contains('page-content')) {
      throw new Error('Expected reused direct leaf to gain .page-content');
    }
    if (!mounted.shadowRoot?.querySelector('#direct-h1')) {
      throw new Error('Expected direct-child DSD to survive');
    }
    if (mounted.shadowRoot.querySelector('#csr-h1')) {
      throw new Error('Expected CSR template NOT to replace adopted direct leaf');
    }
    if (!wrapper.contains(deep)) {
      throw new Error('Expected deep nested same-tag element to remain under wrapper');
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

  it('three-level SSG nest: cascade adopts docks; found/load adopts leaf (no wipe)', async () => {
    clearGraph();
    router.registerContainer('main', mainEl, null);

    const docsTag = 'dock-soft-docs';
    const contentTag = 'dock-soft-doccontent';
    const leafTag = 'doc-soft-nested-leaf';

    // Attach open DSD before define so upgrade adopts (same as SSG parse).
    const docsEl = createWithDsd(docsTag, '<div id="docs-chrome">docs</div><slot></slot>');
    const contentEl = createWithDsd(contentTag, '<slot></slot>');
    const leafEl = createWithDsd(leafTag, '<h1 id="ssg-leaf">SSG leaf</h1>');
    contentEl.appendChild(leafEl);
    docsEl.appendChild(contentEl);
    mainEl.replaceChildren(docsEl);

    ui.dock('soft-docs', { parent: 'main', tag: docsTag, template: '<slot></slot>' });
    ui.dock('soft-content', { parent: 'soft-docs', tag: contentTag, template: '<slot></slot>' });
    await customElements.whenDefined(docsTag);
    await customElements.whenDefined(contentTag);
    await wait(30);

    // Simulate boot race: topology known, live refs cleared, DOM still present.
    for (const name of ['soft-docs', 'soft-content']) {
      const node = getNode(name);
      if (node?.ref) node.ref = null;
    }

    await ensure('soft-content', 'main');

    if (mainEl.querySelector(docsTag) !== docsEl) {
      throw new Error('Expected cascade to adopt pre-rendered docs dock');
    }
    if (docsEl.querySelector(contentTag) !== contentEl) {
      throw new Error('Expected cascade to adopt pre-rendered content dock as light child');
    }
    if (!docsEl.shadowRoot?.querySelector('#docs-chrome')) {
      throw new Error('Expected docs dock DSD chrome to survive cascade adopt');
    }
    if (contentEl.querySelector(leafTag) !== leafEl) {
      throw new Error('Expected leaf to remain light child of content dock after cascade');
    }

    ui.element(leafTag, {
      via: ['main', 'soft-docs', 'soft-content'],
      container: 'soft-content',
      template: '<h1 id="csr-leaf">CSR wipe</h1>'
    });

    emit('found', {
      tag: leafTag,
      params: {},
      query: {},
      hash: '',
      chain: [{ tag: leafTag, params: {} }],
      via: ['main', 'soft-docs', 'soft-content'],
      container: 'soft-content',
      url: 'http://localhost/soft-nested',
      direction: 'load'
    });
    await wait(40);

    if (contentEl.querySelector(leafTag) !== leafEl) {
      throw new Error('Expected orchestrator to reuse SSG leaf inside content dock');
    }
    if (!leafEl.classList.contains('page-content')) {
      throw new Error('Expected adopted leaf to gain .page-content');
    }
    if (!leafEl.shadowRoot?.querySelector('#ssg-leaf')) {
      throw new Error('Expected SSG leaf DSD to survive found/load');
    }
    if (leafEl.shadowRoot.querySelector('#csr-leaf')) {
      throw new Error('Expected CSR template NOT to replace nested SSG leaf');
    }

    // Nested chrome must never appear as light siblings under main.
    if (document.querySelectorAll(docsTag).length !== 1) {
      throw new Error(`Expected exactly one ${docsTag}, got ${document.querySelectorAll(docsTag).length}`);
    }
    if (document.querySelectorAll(contentTag).length !== 1) {
      throw new Error(`Expected exactly one ${contentTag}`);
    }
  });

  it('sanitizeTemplateHtml strips SSG documents that collide with page templates', async () => {
    const { sanitizeTemplateHtml } = await import('../../../src/core/ui/define/utils.js');
    const ssg = `<!DOCTYPE html><html><body><dock-main><dock-docs></dock-docs>
<doc-soft-sanitize class="page-content"><template shadowrootmode="open">
<style>.x{}</style><h1 id="ok">OK</h1>
</template></doc-soft-sanitize></dock-main></body></html>`;
    const out = sanitizeTemplateHtml(ssg, 'doc-soft-sanitize');
    if (!out.includes('id="ok"') || out.includes('dock-docs') || out.includes('<style')) {
      throw new Error(`Expected leaf fragment without docks/style, got: ${out}`);
    }
    const plain = sanitizeTemplateHtml('<h1>Hi</h1>', 'doc-soft-sanitize');
    if (plain !== '<h1>Hi</h1>') {
      throw new Error('Expected plain fragments to pass through');
    }
  });

  it('soft-nav CSR leaf applies page CSS fetched via style URLs', async () => {
    const tag = 'doc-soft-css-leaf';
    const cssBody = 'h1 { color: rgb(1, 2, 3); }';
    const stylePath = '/styles/soft-nav-test.css';
    const styleUrl = `${window.location.origin}${stylePath}`;

    const origFetch = window.fetch;
    window.fetch = async (input) => {
      const href = typeof input === 'string' ? input : input.url;
      if (href.endsWith(stylePath)) {
        return new Response(cssBody, { status: 200, headers: { 'Content-Type': 'text/css' } });
      }
      return origFetch(input);
    };

    try {
      ui.element(tag, {
        via: ['main', 'soft-leaf'],
        container: 'soft-leaf',
        template: '<h1 id="css-h1">Styled</h1>',
        style: [stylePath]
      }, import.meta.url);

      emit('found', {
        tag,
        params: {},
        query: {},
        hash: '',
        chain: [{ tag, params: {} }],
        via: ['main', 'soft-leaf'],
        container: 'soft-leaf',
        url: 'http://localhost/soft-css',
        direction: 'push'
      });
      await wait(60);

      const leaf = leafDock.querySelector(tag);
      if (!leaf?.shadowRoot) {
        throw new Error('Expected CSR leaf to mount on soft-nav');
      }
      const sheets = leaf.shadowRoot.adoptedStyleSheets?.length ?? 0;
      const styleTag = leaf.shadowRoot.querySelector('style');
      if (sheets === 0 && !styleTag) {
        throw new Error('Expected soft-nav leaf to adopt fetched page CSS');
      }
      if (!leaf.shadowRoot.querySelector('#css-h1')) {
        throw new Error('Expected CSR template in soft-nav leaf');
      }
    } finally {
      window.fetch = origFetch;
    }
  });

  it('soft-nav CSR leaf fetches styles under deploy base', async () => {
    const tag = 'doc-soft-css-base-leaf';
    const cssBody = 'h1 { letter-spacing: 0.02em; }';
    const stylePath = '/styles/shared.css';
    const prevBase = globalThis.__ANZA_BASE__;
    globalThis.__ANZA_BASE__ = '/anza';

    const fetched = [];
    const origFetch = window.fetch;
    window.fetch = async (input) => {
      const href = typeof input === 'string' ? input : input.url;
      fetched.push(href);
      if (href.includes('/anza/styles/shared.css')) {
        return new Response(cssBody, { status: 200, headers: { 'Content-Type': 'text/css' } });
      }
      if (href.includes('/styles/shared.css') && !href.includes('/anza/')) {
        return new Response('missing at site root', { status: 404 });
      }
      return origFetch(input);
    };

    try {
      ui.element(tag, {
        via: ['main', 'soft-leaf'],
        container: 'soft-leaf',
        template: '<h1 id="base-css-h1">Base</h1>',
        style: [stylePath]
      }, import.meta.url);

      emit('found', {
        tag,
        params: {},
        query: {},
        hash: '',
        chain: [{ tag, params: {} }],
        via: ['main', 'soft-leaf'],
        container: 'soft-leaf',
        url: 'http://localhost/soft-css-base',
        direction: 'push'
      });
      await wait(60);

      const hitBase = fetched.some((u) => u.includes('/anza/styles/shared.css'));
      const hitRoot = fetched.some((u) => {
        try {
          const path = new URL(u, 'http://localhost').pathname;
          return path === '/styles/shared.css';
        } catch {
          return u === '/styles/shared.css' || u.endsWith('://localhost/styles/shared.css');
        }
      });
      if (!hitBase) {
        throw new Error(
          `Expected style fetch under /anza/styles/shared.css, got: ${JSON.stringify(fetched)}`
        );
      }
      if (hitRoot) {
        throw new Error(
          `Must not fetch site-root /styles/shared.css when __ANZA_BASE__=/anza; got: ${JSON.stringify(fetched)}`
        );
      }

      const leaf = leafDock.querySelector(tag);
      const sheets = leaf?.shadowRoot?.adoptedStyleSheets?.length ?? 0;
      const styleTag = leaf?.shadowRoot?.querySelector('style');
      if (!leaf?.shadowRoot || (sheets === 0 && !styleTag)) {
        throw new Error('Expected soft-nav page CSS loaded from deploy-base URL');
      }
    } finally {
      window.fetch = origFetch;
      if (prevBase === undefined) delete globalThis.__ANZA_BASE__;
      else globalThis.__ANZA_BASE__ = prevBase;
    }
  });

  it('soft-nav aborts leaf ctrl and leaves zero leaf-owned on/watch work', async () => {
    const pageA = 'doc-soft-leak-a';
    const pageB = 'doc-soft-leak-b';

    let aborted = false;
    let clickCalls = 0;
    let watchCalls = 0;
    let slotCalls = 0;
    let leafARef = null;
    let leafARoot = null;

    const { globals } = await import('../../../src/core/platform/globals.js');
    const { getAttachmentStats } = await import('../../../src/core/ui/define/proxy.js');
    const globalsBefore = globals.count();

    ui.element(pageA, {
      via: ['main', 'soft-leaf'],
      container: 'soft-leaf',
      template: '<button class="act">A</button><slot name="extra"></slot>',
      mount({ el, ctrl, on, watch, tags }) {
        leafARef = el;
        leafARoot = el.shadowRoot;
        ctrl.signal.addEventListener('abort', () => { aborted = true; });
        on.click('.act', () => { clickCalls++; });
        const btn = tags.one('.act');
        watch.attr(btn, 'disabled', () => { watchCalls++; });
        watch.slot('slot[name="extra"]', () => { slotCalls++; });
      }
    });

    ui.element(pageB, {
      via: ['main', 'soft-leaf'],
      container: 'soft-leaf',
      template: '<p id="b">B</p>'
    });

    emit('found', {
      tag: pageA,
      params: {},
      query: {},
      hash: '',
      chain: [{ tag: pageA, params: {} }],
      via: ['main', 'soft-leaf'],
      container: 'soft-leaf',
      url: 'http://localhost/soft-leak-a',
      direction: 'push'
    });
    await wait(40);

    const mountedA = leafDock.querySelector(pageA);
    if (!mountedA?.shadowRoot) {
      throw new Error('Expected leaf A mounted');
    }
    const liveStats = getAttachmentStats(mountedA.shadowRoot);
    if (
      !liveStats ||
      liveStats.onRootListeners < 1 ||
      liveStats.watchBuckets < 1 ||
      liveStats.slotListeners < 1
    ) {
      throw new Error(`Expected live leaf attachments incl. slot, got ${JSON.stringify(liveStats)}`);
    }

    mountedA.shadowRoot.querySelector('.act').click();
    if (clickCalls !== 1) {
      throw new Error('Expected on.click to fire while leaf A is live');
    }

    for (let i = 0; i < 3; i++) {
      emit('found', {
        tag: pageB,
        params: {},
        query: {},
        hash: '',
        chain: [{ tag: pageB, params: {} }],
        via: ['main', 'soft-leaf'],
        container: 'soft-leaf',
        url: `http://localhost/soft-leak-b-${i}`,
        direction: 'push'
      });
      await wait(30);
      emit('found', {
        tag: pageA,
        params: {},
        query: {},
        hash: '',
        chain: [{ tag: pageA, params: {} }],
        via: ['main', 'soft-leaf'],
        container: 'soft-leaf',
        url: `http://localhost/soft-leak-a-${i}`,
        direction: 'push'
      });
      await wait(30);
    }

    emit('found', {
      tag: pageB,
      params: {},
      query: {},
      hash: '',
      chain: [{ tag: pageB, params: {} }],
      via: ['main', 'soft-leaf'],
      container: 'soft-leaf',
      url: 'http://localhost/soft-leak-b-final',
      direction: 'push'
    });
    await wait(40);

    if (!aborted) {
      throw new Error('Expected soft-nav to abort leaf A ctrl');
    }
    if (leafARef?.ctrl) {
      throw new Error('Expected detached leaf ctrl to be cleared after disconnect');
    }
    if (leafDock.querySelector(pageA)) {
      throw new Error('Expected leaf A to be swapped out');
    }

    const afterStats = leafARoot ? getAttachmentStats(leafARoot) : null;
    if (
      afterStats &&
      (afterStats.onRootListeners !== 0 ||
        afterStats.onRegistrations !== 0 ||
        afterStats.watchBuckets !== 0 ||
        afterStats.watchRegistrations !== 0 ||
        afterStats.slotListeners !== 0)
    ) {
      throw new Error(`Expected zero leaf attachments after soft-nav, got ${JSON.stringify(afterStats)}`);
    }

    if (globals.count() !== globalsBefore) {
      throw new Error(
        `Expected framework globals.count stable across soft-nav (${globalsBefore} → ${globals.count()})`
      );
    }

    const detachedBtn = mountedA.shadowRoot?.querySelector('.act');
    if (detachedBtn) {
      detachedBtn.click();
      detachedBtn.setAttribute('disabled', '');
      await wait(10);
    }

    if (clickCalls !== 1) {
      throw new Error('Expected no orphaned click handlers after soft-nav');
    }
    if (watchCalls !== 0) {
      throw new Error('Expected no orphaned watch handlers after soft-nav');
    }
    if (slotCalls !== 0) {
      throw new Error('Expected no orphaned slot handlers after soft-nav');
    }
  });
});
