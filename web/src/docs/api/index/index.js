import { page } from '@anzaui/anza/ui';

page('/docs/api/index', {
  tag: 'doc-api-index',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
