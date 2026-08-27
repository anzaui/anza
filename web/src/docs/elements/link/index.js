import { page } from '@anzaui/anza/ui';

page('/docs/elements/link', {
  tag: 'doc-elements-link',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Link — Anza',
    description: 'ui-link — router-aware hyperlink with soft navigation and aria-current.'
  }
}, import.meta.url);
