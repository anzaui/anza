import { page } from '@anzaui/anza/ui';

page('/docs/events/troubleshooting', {
  tag: 'doc-events-troubleshooting',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
