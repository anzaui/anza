import { page } from '@adukiorg/anza/ui';

page('/docs/storage/idb', {
  tag: 'doc-storage-idb',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
