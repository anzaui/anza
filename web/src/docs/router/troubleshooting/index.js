import { page } from '@anzaui/anza/ui';

page('/docs/router/troubleshooting', {
  tag: 'doc-router-troubleshooting',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
