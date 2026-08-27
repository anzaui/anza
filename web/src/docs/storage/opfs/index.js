import { page } from '@anzaui/anza/ui';

page('/docs/storage/opfs', {
  tag: 'doc-storage-opfs',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
