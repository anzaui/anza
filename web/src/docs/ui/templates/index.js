import { page } from '@anzaui/anza/ui';

page('/docs/ui/templates', {
  tag: 'doc-ui-templates',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
