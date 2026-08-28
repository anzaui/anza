import { page } from '@anzaui/anza/ui';

page('/docs/templates/index', {
  tag: 'doc-templates-index',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
