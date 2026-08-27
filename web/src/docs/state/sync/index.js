import { page } from '@anzaui/anza/ui';

page('/docs/state/sync', {
  tag: 'doc-state-sync',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
