import { page } from '@anzaui/anza/ui';

page('/docs/storage/quota', {
  tag: 'doc-storage-quota',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
