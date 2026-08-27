import { page } from '@anzaui/anza/ui';

page('/docs/router/cache', {
  tag: 'doc-router-cache',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
