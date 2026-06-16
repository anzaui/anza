import { page } from '@adukiorg/anza/ui';

page('/docs/router/guards', {
  tag: 'doc-router-guards',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
