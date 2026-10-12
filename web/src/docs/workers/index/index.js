import { page } from '@anzaui/anza/ui';

page('/docs/workers', {
  tag: 'doc-workers',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
