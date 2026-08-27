import { page } from '@anzaui/anza/ui';

page('/docs/animations/animate', {
  tag: 'doc-animations-animate',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
