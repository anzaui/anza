import { page } from '@anzaui/anza/ui';

page('/docs/storage/troubleshooting', {
  tag: 'doc-storage-troubleshooting',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
