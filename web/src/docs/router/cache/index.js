import { page } from '@adukiorg/anza/ui';

page('/docs/router/cache', {
  tag: 'doc-router-cache',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
