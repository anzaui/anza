import { page } from '@adukiorg/anza/ui';

page('/docs/api/index', {
  tag: 'doc-api-index',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
