import { page } from '@anzaui/anza/ui';

page('/docs/events', {
  tag: 'doc-events',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
