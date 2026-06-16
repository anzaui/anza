import { page } from '@adukiorg/anza/ui';

page('/docs/storage/quota', {
  tag: 'doc-storage-quota',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
