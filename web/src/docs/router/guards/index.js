import { page } from '@anzaui/anza/ui';

page('/docs/router/guards', {
  tag: 'doc-router-guards',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
