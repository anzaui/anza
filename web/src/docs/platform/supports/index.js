import { page } from '@anzaui/anza/ui';

page('/docs/platform/supports', {
  tag: 'doc-platform-supports',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
