import { page } from '@adukiorg/anza/ui';

page('/docs/api/uploads', {
  tag: 'doc-api-uploads',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
