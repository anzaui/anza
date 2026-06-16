import { page } from '@adukiorg/anza/ui';

page('/docs/router/index', {
  tag: 'doc-router-index',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
