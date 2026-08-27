import { page } from '@anzaui/anza/ui';

page('/docs/sw/index', {
  tag: 'doc-sw-index',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
