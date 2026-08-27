import { page } from '@anzaui/anza/ui';

page('/docs/events/listen', {
  tag: 'doc-events-listen',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
