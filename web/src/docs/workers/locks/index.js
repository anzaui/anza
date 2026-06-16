import { page } from '@adukiorg/anza/ui';

page('/docs/workers/locks', {
  tag: 'doc-workers-locks',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
