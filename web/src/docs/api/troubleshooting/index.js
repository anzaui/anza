import { page } from '@anzaui/anza/ui';

page('/docs/api/troubleshooting', {
  tag: 'doc-api-troubleshooting',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
