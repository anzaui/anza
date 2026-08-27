import { page } from '@anzaui/anza/ui';

page('/docs/events/index', {
  tag: 'doc-events-index',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
