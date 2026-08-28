import { page } from '@anzaui/anza/ui';

page('/docs/templates/components', {
  tag: 'doc-templates-components',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
