import { page } from '@adukiorg/anza/ui';

page('/docs/api/advanced', {
  tag: 'doc-api-advanced',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
