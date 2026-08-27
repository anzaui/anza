import { page } from '@anzaui/anza/ui';

page('/docs/intro/structure', {
  tag: 'doc-intro-structure',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
