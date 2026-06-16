import { page } from '@adukiorg/anza/ui';

page('/docs/router/index', {
  tag: 'doc-router-index',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
