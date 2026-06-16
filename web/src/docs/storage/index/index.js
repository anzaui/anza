import { page } from '@adukiorg/anza/ui';

page('/docs/storage/index', {
  tag: 'doc-storage-index',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
