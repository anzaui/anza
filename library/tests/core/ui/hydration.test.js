/**
 * tests/core/ui/hydration.test.js
 *
 * Phase 2 DSD adopt-don't-wipe: upgrade must keep pre-attached open shadow
 * content and rehydrate refs/on without cloning the client template over it.
 */

import { ui } from '../../../src/core/ui/index.js';

function wait(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Simulate Declarative Shadow DOM: create host before define, attach open
 * shadow with markup, then define + connect so upgrade adopts the root.
 */
function createWithDsd(tag, markup) {
  const el = document.createElement(tag);
  const shadow = el.attachShadow({ mode: 'open' });
  if (typeof markup === 'string') {
    shadow.innerHTML = markup;
  } else if (markup) {
    shadow.appendChild(markup);
  }
  return el;
}

describe('ui.element DSD hydration (adopt-don\'t-wipe)', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    container = null;
  });

  it('adopts pre-attached open shadow and does not wipe known DSD nodes', async () => {
    const tag = 'test-hydrate-keep-dsd';
    const el = createWithDsd(
      tag,
      '<p id="dsd-marker" ref="marker">server-html</p>'
    );

    let mountCtx = null;
    ui.element(tag, {
      template: '<div id="csr-only">client-template</div>',
      mount(ctx) {
        mountCtx = ctx;
      }
    });

    container.appendChild(el);
    await wait();

    const marker = el.shadowRoot?.querySelector('#dsd-marker');
    if (!marker || marker.textContent !== 'server-html') {
      throw new Error('Expected DSD node to survive custom element upgrade');
    }

    if (el.shadowRoot.querySelector('#csr-only')) {
      throw new Error('Expected client template NOT to be cloned over adopted DSD');
    }

    if (mountCtx?.adopted !== true) {
      throw new Error('Expected mount context.adopted === true');
    }

    if (mountCtx?.refs?.marker !== marker) {
      throw new Error('Expected refs rehydrated from adopted DSD nodes');
    }
  });

  it('CSR path still attaches shadow and clones the client template', async () => {
    const tag = 'test-hydrate-csr-clone';
    let mountCtx = null;

    ui.element(tag, {
      template: '<div id="csr-root" ref="root">csr</div>',
      mount(ctx) {
        mountCtx = ctx;
      }
    });

    const el = document.createElement(tag);
    container.appendChild(el);
    await wait();

    if (!el.shadowRoot?.querySelector('#csr-root')) {
      throw new Error('Expected CSR template clone in fresh shadow root');
    }

    if (mountCtx?.adopted !== false) {
      throw new Error('Expected mount context.adopted === false for CSR');
    }

    if (mountCtx?.refs?.root?.id !== 'csr-root') {
      throw new Error('Expected CSR refs from cloned template');
    }
  });

  it('fills empty adopted shadow once from client template (mismatch fallback)', async () => {
    const tag = 'test-hydrate-empty-adopt';
    const el = createWithDsd(tag, ''); // open shadow, no children

    ui.element(tag, {
      template: '<p id="filled-once">from-client</p>'
    });

    container.appendChild(el);
    await wait();

    const filled = el.shadowRoot?.querySelector('#filled-once');
    if (!filled || filled.textContent !== 'from-client') {
      throw new Error('Expected empty adopted shadow to be filled once from template');
    }
  });

  it('syncs SSG attributes into props on adopt path', async () => {
    const tag = 'test-hydrate-attr-props';
    const el = createWithDsd(tag, '<span ref="label">ok</span>');
    el.setAttribute('count', '7');
    el.setAttribute('active', '');
    el.setAttribute('heading', 'ssg-title');

    ui.element(tag, {
      template: '<span>csr</span>',
      props: {
        count: { type: Number, default: 0 },
        active: { type: Boolean },
        heading: { type: String, default: '' }
      }
    });

    container.appendChild(el);
    await wait();

    if (el.count !== 7) {
      throw new Error(`Expected count prop synced from attribute, got ${el.count}`);
    }
    if (el.active !== true) {
      throw new Error('Expected active boolean synced from attribute');
    }
    if (el.heading !== 'ssg-title') {
      throw new Error(`Expected heading prop synced from attribute, got ${el.heading}`);
    }

    if (!el.shadowRoot?.querySelector('[ref="label"]')) {
      throw new Error('Expected DSD markup retained while attrs synced');
    }
  });

  it('does not duplicate fallback <style> when DSD already has one', async () => {
    const tag = 'test-hydrate-style-adopt';
    const el = createWithDsd(
      tag,
      '<style>/* dsd-style */ :host { color: green; }</style><span id="body">x</span>'
    );

    ui.element(tag, {
      template: '<span id="csr">y</span>',
      style: '/* client-style */ :host { color: red; }'
    });

    container.appendChild(el);
    await wait();

    if (!el.shadowRoot?.querySelector('#body')) {
      throw new Error('Expected DSD body to remain');
    }

    const styleCount = el.shadowRoot.querySelectorAll('style').length;
    const sheets = el.shadowRoot.adoptedStyleSheets?.length ?? 0;

    // Constructable sheets may still apply without wiping; if fallback path,
    // we must not prepend a second <style> over DSD's.
    if (sheets === 0 && styleCount !== 1) {
      throw new Error(`Expected a single DSD <style> on fallback path, got ${styleCount}`);
    }
  });

  it('re-renders once on hard ref mismatch between DSD and client template', async () => {
    const tag = 'test-hydrate-mismatch-once';
    const el = createWithDsd(tag, '<span id="stale">server</span>');

    ui.element(tag, {
      template: '<button id="fresh" ref="action">client</button>'
    });

    container.appendChild(el);
    await wait();

    if (el.shadowRoot?.querySelector('#stale')) {
      throw new Error('Expected mismatched DSD to be replaced once');
    }

    const fresh = el.shadowRoot?.querySelector('#fresh');
    if (!fresh || fresh.getAttribute('ref') !== 'action') {
      throw new Error('Expected one-shot fallback to client template');
    }
  });

  it('binds on.click against adopted DSD nodes after rehydrate', async () => {
    const tag = 'test-hydrate-on-click';
    const el = createWithDsd(
      tag,
      '<button ref="btn" class="go">Go</button>'
    );

    let clicks = 0;
    ui.element(tag, {
      template: '<button ref="btn" class="go">Go</button>',
      mount({ on, refs, adopted }) {
        if (!adopted) {
          throw new Error('Expected adopted === true');
        }
        if (!(refs.btn instanceof HTMLButtonElement)) {
          throw new Error('Expected refs.btn from adopted DSD');
        }
        on.click('.go', () => { clicks++; });
      }
    });

    container.appendChild(el);
    await wait();

    el.shadowRoot.querySelector('.go').click();
    if (clicks !== 1) {
      throw new Error(`Expected on.click to fire once on adopted node, got ${clicks}`);
    }
  });

  it('adopts lingering light-DOM DSD template when shadow is not yet attached', async () => {
    const tag = 'test-hydrate-polyfill-tpl';
    const el = document.createElement(tag);
    const tpl = document.createElement('template');
    tpl.setAttribute('shadowrootmode', 'open');
    tpl.innerHTML = '<em id="from-tpl" ref="em">polyfill</em>';
    el.appendChild(tpl);

    let mountCtx = null;
    ui.element(tag, {
      template: '<div id="csr">nope</div>',
      mount(ctx) {
        mountCtx = ctx;
      }
    });

    container.appendChild(el);
    await wait();

    if (!el.shadowRoot?.querySelector('#from-tpl')) {
      throw new Error('Expected light-DOM DSD template content adopted into shadow');
    }
    if (el.shadowRoot.querySelector('#csr')) {
      throw new Error('Expected adopted DSD template not wiped by CSR clone');
    }
    if (mountCtx?.adopted !== true) {
      throw new Error('Expected adopted === true for polyfill DSD template path');
    }
    if (el.querySelector('template[shadowrootmode]')) {
      throw new Error('Expected DSD template node removed from light DOM after adopt');
    }
  });
});
