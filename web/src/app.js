/**
 * src/app.js — app entry point
 */
import '@adukiorg/anza/ui';
import '@adukiorg/anza/theme';

// docks
import './docks/index.js';
// views
import './views/index.js';
// Pages
import './pages/index.js';
import './docs/index.js';

import { dock } from '@adukiorg/anza/ui';

// Service Worker
navigator.serviceWorker.register('/sw.js', { type: 'module' });

// Layout shell
dock('main');

