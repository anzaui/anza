import { page } from '@anzaui/anza/ui';

page('/docs/animations/api', {
  tag: 'doc-animations-api',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
