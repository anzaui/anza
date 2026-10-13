import { page } from '@anzaui/anza/ui';

page('/docs/elements', {
  tag: 'doc-elements',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Elements — Anza',
    description: 'The ui-* custom element kit: every element by category, with imports and shared behaviour.'
  }
}, import.meta.url);
