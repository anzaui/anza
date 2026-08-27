import { page } from '@anzaui/anza/ui';

page('/docs/sw/strategies', {
  tag: 'doc-sw-strategies',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
