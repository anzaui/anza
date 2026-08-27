import { page } from '@anzaui/anza/ui';

page('/docs/elements/index', {
  tag: 'doc-elements-index',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Elements — Anza',
    description: 'Inventory and import map for the Anza ui-* custom element kit.'
  }
}, import.meta.url);
