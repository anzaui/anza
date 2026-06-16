import { page } from '@adukiorg/anza/ui';

page('/docs/api/errors', {
  tag: 'doc-api-errors',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
