import { page } from '@anzaui/anza/ui';

page('/docs/elements/card', {
  tag: 'doc-elements-card',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Card — Anza',
    description: 'ui-card — content card with header, body, and footer slots.'
  }
}, import.meta.url);
