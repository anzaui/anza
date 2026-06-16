import { page } from '@adukiorg/anza/ui';

page('/docs/api/errors', {
  tag: 'doc-api-errors',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
