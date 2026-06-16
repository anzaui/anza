import { page } from '@adukiorg/anza/ui';

page('/docs/api/advanced', {
  tag: 'doc-api-advanced',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
