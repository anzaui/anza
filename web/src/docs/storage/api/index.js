import { page } from '@anzaui/anza/ui';

page('/docs/storage/api', {
  tag: 'doc-storage-api',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
