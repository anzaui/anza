import { page } from '@anzaui/anza/ui';

page('/docs/state/api', {
  tag: 'doc-state-api',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
