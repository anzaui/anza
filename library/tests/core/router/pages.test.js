/**
 * tests/core/router/pages.test.js
 *
 * Dock/page-scoped fallbacks: nested docks, leaf host, override ladder.
 */

import { router } from '../../../src/core/router/index.js';
import {
  renderPageKind,
  configurePages,
  resetPages,
  rememberVia,
  normalizeOverride
} from '../../../src/core/router/pages.js';
import { registerContainer, clearContainers } from '../../../src/core/router/container.js';
import { reset as resetBoot } from '../../../src/core/router/boot.js';
import { view } from '../../../src/core/ui/defs/view.js';

describe('Router fallback pages (dock-scoped)', () => {
  let shell;
  let mainEl;
  let docsEl;
  let contentEl;

  function ensureView(tag, template) {
    if (!customElements.get(tag)) {
      view(tag, { template });
    }
  }

  beforeEach(() => {
    shell = document.createElement('main');
    shell.id = 'main';
    document.body.appendChild(shell);

    class DockMain extends HTMLElement {}
    class DockDocs extends HTMLElement {}
    class DockContent extends HTMLElement {}
    if (!customElements.get('test-dock-main')) customElements.define('test-dock-main', DockMain);
    if (!customElements.get('test-dock-docs')) customElements.define('test-dock-docs', DockDocs);
    if (!customElements.get('test-dock-content')) customElements.define('test-dock-content', DockContent);

    mainEl = document.createElement('test-dock-main');
    docsEl = document.createElement('test-dock-docs');
    contentEl = document.createElement('test-dock-content');
    // Simulate chrome that must survive a leaf miss
    docsEl.appendChild(Object.assign(document.createElement('aside'), { textContent: 'sidebar' }));
    docsEl.appendChild(contentEl);
    mainEl.appendChild(docsEl);
    shell.appendChild(mainEl);

    router.destroy();
    router.clear();
    clearContainers();
    resetBoot();
    resetPages();

    // Class statics persist across instances — reset every test
    for (const C of [mainEl.constructor, docsEl.constructor, contentEl.constructor]) {
      C.notfound = undefined;
      C.error = undefined;
      C.offline = undefined;
    }

    registerContainer('main', mainEl, null, 'test-dock-main');
    registerContainer('docs', docsEl, 'main', 'test-dock-docs');
    registerContainer('content', contentEl, 'docs', 'test-dock-content');
  });

  afterEach(() => {
    router.destroy();
    router.clear();
    clearContainers();
    resetBoot();
    resetPages();
    shell?.remove();
  });

  it('normalizeOverride accepts tag string, { tag }, and HTML', () => {
    if (normalizeOverride('page-not-found')?.tag !== 'page-not-found') {
      throw new Error('expected tag string');
    }
    if (normalizeOverride({ tag: 'page-x' })?.tag !== 'page-x') {
      throw new Error('expected { tag }');
    }
    if (!normalizeOverride('<h1>404</h1>')?.html?.includes('404')) {
      throw new Error('expected html');
    }
  });

  it('renders built-in notfound into the leaf dock, not the shell', async () => {
    rememberVia(['main', 'docs', 'content']);
    await renderPageKind('notfound', {
      url: 'http://localhost/missing',
      via: ['main', 'docs', 'content']
    });
    if (!contentEl.querySelector('[data-fallback-kind="notfound"]')) {
      throw new Error('expected 404 leaf inside content dock');
    }
    if (!docsEl.querySelector('aside') || docsEl.querySelector('aside').textContent !== 'sidebar') {
      throw new Error('docs chrome must survive leaf miss');
    }
  });

  it('nested docks: content notfound wins over main notfound; host stays content', async () => {
    ensureView('page-test-content-nf', '<p data-id="content-nf">Content 404</p>');
    ensureView('page-test-main-nf', '<p data-id="main-nf">Main 404</p>');

    mainEl.constructor.notfound = { tag: 'page-test-main-nf' };
    contentEl.constructor.notfound = { tag: 'page-test-content-nf' };

    await renderPageKind('notfound', {
      url: 'http://localhost/docs/missing',
      via: ['main', 'docs', 'content']
    });

    if (!contentEl.querySelector('page-test-content-nf')) {
      throw new Error('expected content dock custom notfound');
    }
    if (mainEl.querySelector(':scope > page-test-main-nf')) {
      throw new Error('must not replace main shell when content has override');
    }
    if (!docsEl.querySelector('aside')) {
      throw new Error('sidebar must remain');
    }
  });

  it('nested docks: ancestor main template mounts into leaf when content has none', async () => {
    ensureView('page-test-main-nf', '<p data-id="main-nf">Main 404</p>');
    mainEl.constructor.notfound = { tag: 'page-test-main-nf' };
    // content has no notfound

    await renderPageKind('notfound', {
      via: ['main', 'docs', 'content']
    });

    if (!contentEl.querySelector('page-test-main-nf')) {
      throw new Error('ancestor template should mount into leaf host');
    }
    if (mainEl.querySelector(':scope > page-test-main-nf')) {
      throw new Error('must not wipe main when mounting ancestor template into leaf');
    }
  });

  it('app configure is optional fallback when no dock defines the kind', async () => {
    ensureView('page-test-app-nf', '<p data-id="app-nf">App 404</p>');
    configurePages({ notfound: { tag: 'page-test-app-nf' } });

    await renderPageKind('notfound', { via: ['main', 'docs', 'content'] });

    if (!contentEl.querySelector('page-test-app-nf')) {
      throw new Error('expected app tag in leaf content dock');
    }
  });

  it('dock override beats app configure', async () => {
    ensureView('page-test-content-nf', '<p>C</p>');
    ensureView('page-test-app-nf', '<p>A</p>');
    configurePages({ notfound: { tag: 'page-test-app-nf' } });
    contentEl.constructor.notfound = { tag: 'page-test-content-nf' };

    await renderPageKind('notfound', { via: ['main', 'docs', 'content'] });

    if (!contentEl.querySelector('page-test-content-nf')) {
      throw new Error('dock must beat app configure');
    }
    if (contentEl.querySelector('page-test-app-nf')) {
      throw new Error('app tag must not appear when dock wins');
    }
  });

  it('route error beats dock error; still mounts into leaf', async () => {
    ensureView('page-test-route-err', '<p data-id="route">R</p>');
    ensureView('page-test-dock-err', '<p data-id="dock">D</p>');
    contentEl.constructor.error = { tag: 'page-test-dock-err' };

    await renderPageKind('error', {
      error: new Error('boom'),
      phase: 'handler',
      via: ['main', 'docs', 'content'],
      route: { meta: { error: { tag: 'page-test-route-err' } } }
    });

    const leaf = contentEl.querySelector('page-test-route-err');
    if (!leaf) throw new Error('expected route error leaf in content');
    if (leaf.message !== 'boom') throw new Error('expected message prop');
    if (contentEl.querySelector('page-test-dock-err')) {
      throw new Error('route must beat dock');
    }
  });

  it('notFound handler returning false falls through to dock auto-mount', async () => {
    ensureView('page-test-content-nf', '<p>C</p>');
    contentEl.constructor.notfound = { tag: 'page-test-content-nf' };
    let sawHost = false;
    router.notFound(async (ctx) => {
      sawHost = ctx.host === contentEl;
      return false;
    });

    await renderPageKind('notfound', { via: ['main', 'docs', 'content'] });

    if (!sawHost) throw new Error('handler should see leaf host');
    if (!contentEl.querySelector('page-test-content-nf')) {
      throw new Error('expected fall-through auto-mount');
    }
  });

  it('rememberVia alone scopes miss to last leaf dock', async () => {
    contentEl.constructor.notfound = '<b data-testid="via">via-miss</b>';
    rememberVia(['main', 'docs', 'content']);
    await renderPageKind('notfound', { url: 'http://localhost/y' });
    if (!contentEl.innerHTML.includes('via-miss')) {
      throw new Error('expected content dock from lastVia');
    }
    if (!docsEl.querySelector('aside')) {
      throw new Error('sidebar must survive');
    }
  });

  it('pages.show offline mounts into leaf dock', async () => {
    await router.pages.show('offline', { via: ['main', 'docs', 'content'] });
    const leaf = contentEl.querySelector('[data-fallback-kind="offline"]');
    if (!leaf || !leaf.innerHTML.toLowerCase().includes('offline')) {
      throw new Error('expected offline in content');
    }
  });
});
