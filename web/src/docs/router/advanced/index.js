import { page } from '@adukiorg/anza/ui';

page('/docs/router/advanced', {
  tag: 'doc-router-advanced',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
