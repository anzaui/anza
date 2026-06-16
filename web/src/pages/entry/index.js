/**
 * src/pages/index/index.js — welcome page
 */
import { page } from '@adukiorg/anza/ui';

import '../../views/code/index.js';

page('/', {
  tag: 'page-welcome',
  via: ['main'],
  template: { html: './index.html', css: './index.css' }
}, import.meta.url);
