import { page } from '@anzaui/anza/ui';

page('/docs/ui/props', {
  tag: 'doc-ui-props',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
