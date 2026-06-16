import { page } from '@adukiorg/anza/ui';

page('/docs/workers/quickstart', {
  tag: 'doc-workers-quickstart',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
