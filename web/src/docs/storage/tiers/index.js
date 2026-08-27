import { page } from '@anzaui/anza/ui';

page('/docs/storage/tiers', {
  tag: 'doc-storage-tiers',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
