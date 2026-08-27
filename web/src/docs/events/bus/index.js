import { page } from '@anzaui/anza/ui';

page('/docs/events/bus', {
  tag: 'doc-events-bus',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
