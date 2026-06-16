import { page } from '@adukiorg/anza/ui';

page('/docs/router/advanced', {
  tag: 'doc-router-advanced',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
