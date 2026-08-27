import { page } from '@anzaui/anza/ui';

page('/docs/api/requests', {
  tag: 'doc-api-requests',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
