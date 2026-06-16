import { page } from '@adukiorg/anza/ui';

page('/docs/api/requests', {
  tag: 'doc-api-requests',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
