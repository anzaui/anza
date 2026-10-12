import { page } from '@anzaui/anza/ui';

page('/docs/ui', {
  tag: 'doc-ui',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
