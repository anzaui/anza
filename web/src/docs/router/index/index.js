import { page } from '@anzaui/anza/ui';

page('/docs/router', {
  tag: 'doc-router',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
