import { page } from '@adukiorg/anza/ui';

page('/docs/workers/api', {
  tag: 'doc-workers-api',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
