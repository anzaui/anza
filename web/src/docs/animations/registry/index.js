import { page } from '@anzaui/anza/ui';

page('/docs/animations/registry', {
  tag: 'doc-animations-registry',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
