import { page } from '@anzaui/anza/ui';

page('/docs/sw', {
  tag: 'doc-sw',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
