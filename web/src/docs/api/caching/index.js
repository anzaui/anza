import { page } from '@anzaui/anza/ui';

page('/docs/api/caching', {
  tag: 'doc-api-caching',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
