import { page } from '@anzaui/anza/ui';

page('/docs/animations/stagger', {
  tag: 'doc-animations-stagger',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
