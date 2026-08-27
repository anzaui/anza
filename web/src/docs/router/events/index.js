import { page } from '@anzaui/anza/ui';

page('/docs/router/events', {
  tag: 'doc-router-events',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
