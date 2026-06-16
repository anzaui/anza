import { page } from '@adukiorg/anza/ui';

page('/docs/workers/locks', {
  tag: 'doc-workers-locks',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
