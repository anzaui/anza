import { page } from '@anzaui/anza/ui';

page('/docs/state/troubleshooting', {
  tag: 'doc-state-troubleshooting',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
