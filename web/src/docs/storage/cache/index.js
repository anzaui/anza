import { page } from '@anzaui/anza/ui';

page('/docs/storage/cache', {
  tag: 'doc-storage-cache',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
