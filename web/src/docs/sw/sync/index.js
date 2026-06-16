import { page } from '@adukiorg/anza/ui';

page('/docs/sw/sync', {
  tag: 'doc-sw-sync',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
