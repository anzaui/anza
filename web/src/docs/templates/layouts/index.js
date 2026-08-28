import { page } from '@anzaui/anza/ui';

page('/docs/templates/layouts', {
  tag: 'doc-templates-layouts',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
