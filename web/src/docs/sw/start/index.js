import { page } from '@adukiorg/anza/ui';

page('/docs/sw/start', {
  tag: 'doc-sw-start',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
