import { page } from '@anzaui/anza/ui';

page('/docs/templates', {
  tag: 'doc-templates',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
