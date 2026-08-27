import { page } from '@anzaui/anza/ui';

page('/docs/elements/text', {
  tag: 'doc-elements-text',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Text — Anza',
    description: 'ui-text — typography primitive bound to design tokens.'
  }
}, import.meta.url);
