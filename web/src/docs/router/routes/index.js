import { page } from '@anzaui/anza/ui';

page('/docs/router/routes', {
  tag: 'doc-router-routes',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
