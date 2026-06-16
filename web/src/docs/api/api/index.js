import { page } from '@adukiorg/anza/ui';

page('/docs/api/api', {
  tag: 'doc-api-api',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
