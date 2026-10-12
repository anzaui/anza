import { page } from '@anzaui/anza/ui';

page('/docs/intro', {
  tag: 'doc-intro',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['./index.css', '/styles/shared.css'],
}, import.meta.url);
