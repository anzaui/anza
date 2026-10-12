import { page } from '@anzaui/anza/ui';

page('/docs/storage', {
  tag: 'doc-storage',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
