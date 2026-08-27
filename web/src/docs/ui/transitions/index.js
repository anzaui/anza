import { page } from '@anzaui/anza/ui';

page('/docs/ui/transitions', {
  tag: 'doc-ui-transitions',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
