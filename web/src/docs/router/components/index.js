import { page } from '@anzaui/anza/ui';

page('/docs/router/components', {
  tag: 'doc-router-components',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
