import { page } from '@anzaui/anza/ui';

page('/docs/api/quickstart', {
  tag: 'doc-api-quickstart',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
