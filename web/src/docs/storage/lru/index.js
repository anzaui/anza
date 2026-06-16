import { page } from '@adukiorg/anza/ui';

page('/docs/storage/lru', {
  tag: 'doc-storage-lru',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
