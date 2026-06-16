import { page } from '@adukiorg/anza/ui';

page('/docs/api/uploads', {
  tag: 'doc-api-uploads',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
