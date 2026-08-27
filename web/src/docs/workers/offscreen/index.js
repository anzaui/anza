import { page } from '@anzaui/anza/ui';

page('/docs/workers/offscreen', {
  tag: 'doc-workers-offscreen',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
