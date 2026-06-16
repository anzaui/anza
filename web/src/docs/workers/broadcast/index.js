import { page } from '@adukiorg/anza/ui';

page('/docs/workers/broadcast', {
  tag: 'doc-workers-broadcast',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
