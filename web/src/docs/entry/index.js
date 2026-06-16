/**
 * src/docs/entry/index.js — docs landing page
 */
import { page, view } from '@adukiorg/anza/ui';

// Docs landing page
page('/docs', {
  tag: 'page-docs',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html', css: './index.css' }
}, import.meta.url);
