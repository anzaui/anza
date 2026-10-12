/**
 * src/app.js — app entry point
 */
import '@anzaui/anza/ui';
import '@anzaui/anza/theme';

// docks
import './docks/index.js';
// views
import './views/index.js';
// Pages
import './pages/index.js';
import './docs/index.js';

import { dock } from '@anzaui/anza/ui';

// Service Worker: production hosts only. On local hosts, remove any worker
// and caches left over from earlier builds so dev never serves stale files.
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
if ('serviceWorker' in navigator) {
  if (LOCAL_HOSTS.has(location.hostname)) {
    // One-time: once the stale worker is gone there is nothing left to do.
    navigator.serviceWorker
      .getRegistrations()
      .then(async (regs) => {
        if (!regs.length) return;
        await Promise.all(regs.map((reg) => reg.unregister()));
        if (self.caches) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }
      })
      .catch(() => {});
  } else {
    navigator.serviceWorker.register('/sw.js', { type: 'module' });
  }
}

// Layout shell
dock('main');

