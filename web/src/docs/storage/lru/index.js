import { page } from '@adukiorg/anza/ui';

page('/docs/storage/lru', {
  tag: 'doc-storage-lru',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
