import { page } from '@anzaui/anza/ui';

page('/docs/router/pages', {
  tag: 'doc-router-pages',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
