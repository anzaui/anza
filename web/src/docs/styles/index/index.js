import { page } from '@anzaui/anza/ui';

page('/docs/styles', {
  tag: 'doc-styles',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
