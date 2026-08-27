import { page } from '@anzaui/anza/ui';

page('/docs/ui/observers', {
  tag: 'doc-ui-observers',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
