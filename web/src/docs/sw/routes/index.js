import { page } from '@adukiorg/anza/ui';

page('/docs/sw/routes', {
  tag: 'doc-sw-routes',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
