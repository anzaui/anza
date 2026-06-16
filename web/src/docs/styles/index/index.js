import { page } from '@adukiorg/anza/ui';

page('/docs/styles/index', {
  tag: 'doc-styles-index',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
