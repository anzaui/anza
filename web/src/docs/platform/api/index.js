import { page } from '@adukiorg/anza/ui';

page('/docs/platform/api', {
  tag: 'doc-platform-api',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
