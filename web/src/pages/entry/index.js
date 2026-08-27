/**
 * src/pages/index/index.js — welcome page
 */
import { page } from '@anzaui/anza/ui';

import '../../views/code/index.js';

page('/', {
  tag: 'page-welcome',
  via: ['main'],
  seo: {
    title: 'Anza',
    description: 'Native ESM web platform — pages, docks, and offline-first apps.'
  },
  template: { html: './index.html', css: './index.css' }
}, import.meta.url);
