import { page } from '@anzaui/anza/ui';

page('/docs/state/persist', {
  tag: 'doc-state-persist',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
