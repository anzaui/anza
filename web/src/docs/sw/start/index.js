import { page } from '@adukiorg/anza/ui';

page('/docs/sw/start', {
  tag: 'doc-sw-start',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
