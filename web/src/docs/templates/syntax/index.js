import { page } from '@anzaui/anza/ui';

page('/docs/templates/syntax', {
  tag: 'doc-templates-syntax',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
