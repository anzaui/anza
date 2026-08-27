import { page } from '@anzaui/anza/ui';

page('/docs/elements/icon', {
  tag: 'doc-elements-icon',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Icon — Anza',
    description: 'ui-icon — accessible SVG sprite icon with size tokens and ARIA decoration.'
  }
}, import.meta.url);
