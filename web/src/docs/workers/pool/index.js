import { page } from '@adukiorg/anza/ui';

page('/docs/workers/pool', {
  tag: 'doc-workers-pool',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
