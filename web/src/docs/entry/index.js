/**
 * src/docs/entry/index.js — docs landing page
 */
import { page } from '@anzaui/anza/ui';

// Docs landing page
page('/docs', {
  tag: 'page-docs',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['./index.css', '/styles/shared.css']
}, import.meta.url);
