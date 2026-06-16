import { page } from '@adukiorg/anza/ui';

page('/docs/api/streaming', {
  tag: 'doc-api-streaming',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
