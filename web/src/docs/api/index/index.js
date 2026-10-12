import { page } from '@anzaui/anza/ui';

page('/docs/api', {
  tag: 'doc-api',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
