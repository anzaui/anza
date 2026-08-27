import { page } from '@anzaui/anza/ui';

page('/docs/state/quickstart', {
  tag: 'doc-state-quickstart',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
