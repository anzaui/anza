import { page } from '@adukiorg/anza/ui';

page('/docs/sw/api', {
  tag: 'doc-sw-api',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
