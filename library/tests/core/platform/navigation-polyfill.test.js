/**
 * tests/core/platform/navigation-polyfill.test.js
 *
 * Firefox soft-nav depends on the Navigation polyfill's document click
 * interceptor. Dock templates put <a> inside shadow roots — clicks must be
 * resolved via composedPath, not event.target.closest.
 */

describe('Navigation polyfill soft-nav clicks', () => {
  let originalNavigation;
  let host;
  let anchor;

  beforeEach(async () => {
    originalNavigation = globalThis.navigation;
    // Force polyfill path even when the test browser has native Navigation.
    delete globalThis.navigation;

    const { supports, reset } = await import('../../../src/core/platform/supports.js');
    Object.defineProperty(supports, 'navigationAPI', { value: false, configurable: true });
    reset('navigationAPI');

    await import('../../../src/core/platform/polyfills/navigation.js');

    host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    anchor = document.createElement('a');
    anchor.setAttribute('href', '/docs/shadow-soft-nav');
    anchor.textContent = 'Shadow link';
    shadow.appendChild(anchor);
    document.body.appendChild(host);
  });

  afterEach(() => {
    host?.remove();
    host = null;
    anchor = null;
    if (originalNavigation !== undefined) {
      globalThis.navigation = originalNavigation;
    }
  });

  it('intercepts same-origin clicks on anchors inside shadow roots', async () => {
    const nav = globalThis.navigation;
    if (!nav || typeof nav.addEventListener !== 'function') {
      throw new Error('Expected Navigation polyfill to install');
    }

    let interceptedUrl = null;
    nav.addEventListener('navigate', (event) => {
      interceptedUrl = event.destination?.url;
      event.intercept({ handler: async () => {} });
    });

    const click = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      composed: true,
      button: 0
    });
    const prevented = !anchor.dispatchEvent(click);

    if (!interceptedUrl) {
      throw new Error('Expected navigate event for shadow-DOM anchor click');
    }
    if (!String(interceptedUrl).includes('/docs/shadow-soft-nav')) {
      throw new Error(`Expected soft-nav URL, got ${interceptedUrl}`);
    }
    if (!prevented && !click.defaultPrevented) {
      // Polyfill calls preventDefault only after intercept; verify either path.
      // Some environments report defaultPrevented on the event object instead.
      if (!click.defaultPrevented) {
        throw new Error('Expected soft-nav to preventDefault on shadow anchor click');
      }
    }
  });
});
