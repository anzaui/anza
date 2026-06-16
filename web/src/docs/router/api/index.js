import { page } from '@adukiorg/anza/ui';

page('/docs/router/api', {
  tag: 'doc-router-api',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
