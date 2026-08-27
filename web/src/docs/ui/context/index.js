import { page } from '@anzaui/anza/ui';

page('/docs/ui/context', {
  tag: 'doc-ui-context',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
