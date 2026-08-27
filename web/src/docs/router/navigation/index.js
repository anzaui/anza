import { page } from '@anzaui/anza/ui';

page('/docs/router/navigation', {
  tag: 'doc-router-navigation',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
