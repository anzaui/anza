/**
 * tests/core/router/loading.test.js
 *
 * Per-dock soft-nav loading UI: show/hide, override ladder, abort on supersede.
 */

import { router } from '../../../src/core/router/index.js';
import {
  beginLoading,
  endLoading,
  clearLoading,
  configureLoading,
  resetLoading,
  resolveLoading,
  normalizeLoading
} from '../../../src/core/router/loading.js';
import { registerContainer, clearContainers } from '../../../src/core/router/container.js';
import { reset as resetBoot } from '../../../src/core/router/boot.js';
import { resetPages } from '../../../src/core/router/pages.js';
import { specRegistry } from '../../../src/core/ui/define/state.js';

describe('Router loading (dock-scoped)', () => {
  let shell;
  let mainEl;
  let contentEl;

  beforeEach(() => {
    shell = document.createElement('main');
    shell.id = 'main';
    document.body.appendChild(shell);

    class DockMain extends HTMLElement {}
    class DockContent extends HTMLElement {}
    if (!customElements.get('test-loading-main')) {
      customElements.define('test-loading-main', DockMain);
    }
    if (!customElements.get('test-loading-content')) {
      customElements.define('test-loading-content', DockContent);
    }

    mainEl = document.createElement('test-loading-main');
    contentEl = document.createElement('test-loading-content');
    mainEl.appendChild(contentEl);
    shell.appendChild(mainEl);

    router.destroy();
    router.clear();
    clearContainers();
    resetBoot();
    resetPages();
    resetLoading();
    specRegistry.clear();

    mainEl.constructor.loading = undefined;
    mainEl.constructor.loadingDisabled = false;
    contentEl.constructor.loading = undefined;
    contentEl.constructor.loadingDisabled = false;

    registerContainer('main', mainEl, null, 'test-loading-main');
    registerContainer('content', contentEl, 'main', 'test-loading-content');
  });

  afterEach(() => {
    router.destroy();
    router.clear();
    clearContainers();
    resetBoot();
    resetPages();
    resetLoading();
    shell?.remove();
  });

  it('normalizeLoading accepts tag, html, and false', () => {
    if (normalizeLoading(false)?.disabled !== true) {
      throw new Error('false should disable loading');
    }
    if (normalizeLoading('ui-spinner')?.tag !== 'ui-spinner') {
      throw new Error('tag string expected');
    }
    if (!normalizeLoading({ html: '<p>wait</p>' })?.html) {
      throw new Error('html override expected');
    }
  });

  it('shows built-in loading in leaf dock on soft-nav', async () => {
    const ctx = await beginLoading(['main', 'content'], null, 'push');
    if (ctx.skipped) throw new Error('expected loading to show');
    if (!contentEl.hasAttribute('data-loading')) {
      throw new Error('expected data-loading on leaf dock');
    }
    if (!contentEl.querySelector('.dock-loading')) {
      throw new Error('expected .dock-loading node');
    }
    endLoading(contentEl, ctx.gen);
    if (contentEl.querySelector('.dock-loading')) {
      throw new Error('loading should be removed after endLoading');
    }
  });

  it('skips loading on direction load (hard refresh)', async () => {
    const ctx = await beginLoading(['main', 'content'], null, 'load');
    if (!ctx.skipped) throw new Error('load direction should skip loading');
    if (contentEl.querySelector('.dock-loading')) {
      throw new Error('no loading UI on boot');
    }
  });

  it('respects dock loading: false', async () => {
    contentEl.constructor.loadingDisabled = true;
    const { disabled } = resolveLoading(['main', 'content']);
    if (!disabled) throw new Error('expected disabled when dock sets loading: false');
    const ctx = await beginLoading(['main', 'content'], null, 'push');
    if (!ctx.skipped) throw new Error('disabled dock should skip loading');
  });

  it('page override wins over dock default', () => {
    contentEl.constructor.loading = { html: '<p>dock</p>' };
    specRegistry.set('page-test', { loading: { html: '<p>page</p>' } });
    const { override } = resolveLoading(['main', 'content'], 'page-test');
    if (override?.html !== '<p>page</p>') {
      throw new Error('page loading should win over dock');
    }
  });

  it('app configure applies when dock has no override', () => {
    configureLoading({ html: '<p>app</p>' });
    const { override } = resolveLoading(['main', 'content']);
    if (override?.html !== '<p>app</p>') {
      throw new Error('app configure should apply');
    }
  });

  it('superseded navigation clears prior loading', async () => {
    const first = await beginLoading(['main', 'content'], null, 'push');
    const second = await beginLoading(['main', 'content'], null, 'push');
    endLoading(contentEl, first.gen);
    if (!contentEl.querySelector('.dock-loading')) {
      throw new Error('second loading should remain after first gen ends');
    }
    endLoading(contentEl, second.gen);
    clearLoading(contentEl);
  });
});
