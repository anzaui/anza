import { page } from '@anzaui/anza/ui';

page('/docs/workers/shared', {
  tag: 'doc-workers-shared',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
