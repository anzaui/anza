import { page } from '@anzaui/anza/ui';

page('/docs/router/handlers', {
  tag: 'doc-router-handlers',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
