import { page } from '@anzaui/anza/ui';

page('/docs/elements/layout', {
  tag: 'doc-elements-layout',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Layout — Anza',
    description: 'App shells and composition primitives: stack, grid, split, scroll, surface.'
  }
}, import.meta.url);
