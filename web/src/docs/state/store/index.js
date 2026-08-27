import { page } from '@anzaui/anza/ui';

page('/docs/state/store', {
  tag: 'doc-state-store',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
