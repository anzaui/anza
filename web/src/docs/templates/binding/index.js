import { page } from '@anzaui/anza/ui';

page('/docs/templates/binding', {
  tag: 'doc-templates-binding',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
