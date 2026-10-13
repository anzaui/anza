import { page } from '@anzaui/anza/ui';

page('/docs/elements/text', {
  tag: 'doc-elements-text',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Text — Anza',
    description: 'ui-text — typography element: pick the rendered tag with as, and size, weight, color and family from design tokens.'
  }
}, import.meta.url);
