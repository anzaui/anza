import { page } from '@adukiorg/anza/ui';

page('/docs/storage/idb', {
  tag: 'doc-storage-idb',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
