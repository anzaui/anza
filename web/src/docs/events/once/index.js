import { page } from '@anzaui/anza/ui';

page('/docs/events/once', {
  tag: 'doc-events-once',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
