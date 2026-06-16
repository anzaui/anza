/**
 * src/app.js — app entry point
 */
import '@adukiorg/anza/ui';
import { theme } from '@adukiorg/anza/theme';

theme.set(theme.get() === 'light' ? 'light' : 'dark');

// docks
import './docks/index.js';
// views
import './views/index.js';
// Pages
import './pages/index.js';
import './docs/index.js';

import { dock } from '@adukiorg/anza/ui';

// Service Worker
navigator.serviceWorker.register('/dist/sw.js', { type: 'module' });

// Layout shell
dock('main');

