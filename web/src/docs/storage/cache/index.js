import { page } from '@adukiorg/anza/ui';

page('/docs/storage/cache', {
  tag: 'doc-storage-cache',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
