import { page } from '@anzaui/anza/ui';

page('/docs/ui/quickstart', {
  tag: 'doc-ui-quickstart',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
