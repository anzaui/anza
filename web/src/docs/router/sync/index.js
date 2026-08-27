import { page } from '@anzaui/anza/ui';

page('/docs/router/sync', {
  tag: 'doc-router-sync',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
