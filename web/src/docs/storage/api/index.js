import { page } from '@adukiorg/anza/ui';

page('/docs/storage/api', {
  tag: 'doc-storage-api',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
