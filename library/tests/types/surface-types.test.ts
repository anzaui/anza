/**
 * tests/types/surface-types.test.ts
 *
 * Compile-only checks for the public surface typed in Phase 4 (D6, D7):
 * flat root exports, FREEZE §3.2 exports, dock() fallbacks, view/part,
 * and the defs / sw / elements subpaths.
 */

import { element, page, dock, navigate, api, seal, quota, gate } from '@anzaui/anza';
import { gate as routerGate, ready, reset } from '@anzaui/anza/router';
import { unseal, security } from '@anzaui/anza/security';
import { quota as storageQuota, Database, LRUCache } from '@anzaui/anza/storage';
import { view, part, transition } from '@anzaui/anza/ui';
import { page as defPage, dock as defDock } from '@anzaui/anza/defs';
import { router as swRouter, CacheFirst, NetworkFirst } from '@anzaui/anza/sw';
import { showToast } from '@anzaui/anza/elements';
import { show } from '@anzaui/anza/elements/toast';
import '@anzaui/anza/elements/button';

// Root entry is flat: functions are importable directly.
element('x-hello', { template: '<p>hi</p>' });
navigate('/');
api.get('/x');

// FREEZE §3.2 exports.
const g: Promise<number> = gate(Promise.resolve(1));
routerGate(customElements.whenDefined('page-home'));
const isReady: boolean = ready();
reset();

async function crypto(key: CryptoKey) {
  const sealed: string = await seal(key, 'x');
  const plain: string = await unseal(key, sealed);
  const viaFacade: string = await security.seal(key, plain);
  const { usage } = await quota.estimate();
  const warned: boolean = await storageQuota.check();
  return [viaFacade, usage, warned];
}

// dock() options, including fallbacks, loading and transition.
dock('main', {
  notfound: { tag: 'page-not-found' },
  error: '<p>Something went wrong</p>',
  offline: { html: '<p>Offline</p>' },
  loading: false,
  transition: { name: 'dock-main' }
});
defDock('docs', { parent: 'main', loading: 'ui-spinner' });

page('/', { tag: 'page-home', via: ['main'], loading: { tag: 'ui-skeleton' } });
defPage(['/blog', '/blog/:slug'], { tag: 'page-blog', error: 'page-error' });

view('user-card', {
  props: { name: { type: String } },
  template: { html: '<p></p>', css: ':host{display:block}' },
  on: {
    connect() {
      this.render();
    },
    render() {}
  }
});
part('ui-chip', { template: '<span><slot></slot></span>' });
transition(() => {}, { scope: 'document' });

// Storage classes.
const db = new Database('app', 1, [(d) => d.createObjectStore('kv')]);
const lru = new LRUCache<string, number>(10);
lru.set('a', 1);
const hit: number | null = lru.get('a');

// Service worker helpers.
const r = swRouter();
r.register('/api/*', new NetworkFirst('api', { timeout: 3000 }));
r.register('*', new CacheFirst('shell', { ttl: 60_000 }));

// Elements.
showToast('Saved', { duration: 2000 });
show('Saved');
const btn: HTMLElementTagNameMap['ui-button'] = document.createElement('ui-button');

export { g, isReady, crypto, db, hit, btn };
