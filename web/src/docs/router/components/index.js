import { page } from '@adukiorg/anza/ui';

page('/docs/router/components', {
  tag: 'doc-router-components',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
