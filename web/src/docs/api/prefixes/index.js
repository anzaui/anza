import { page } from '@anzaui/anza/ui';

page('/docs/api/prefixes', {
  tag: 'doc-api-prefixes',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
