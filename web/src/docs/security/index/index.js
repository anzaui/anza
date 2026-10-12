import { page } from '@anzaui/anza/ui';

page('/docs/security', {
  tag: 'doc-security',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
