import { page } from '@anzaui/anza/ui';

page('/docs/router/api', {
  tag: 'doc-router-api',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
