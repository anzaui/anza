import { page } from '@adukiorg/anza/ui';

page('/docs/sw/sync', {
  tag: 'doc-sw-sync',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
