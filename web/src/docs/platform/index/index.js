import { page } from '@anzaui/anza/ui';

page('/docs/platform/index', {
  tag: 'doc-platform-index',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
