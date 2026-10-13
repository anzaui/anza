import { page } from '@anzaui/anza/ui';

page('/docs/elements/overlay', {
  tag: 'doc-elements-overlay',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Overlay patterns — Anza',
    description: 'How the overlay elements share the top layer: popover vs dialog, the Popover polyfill, guard.escape for custom floats, and cleanup.'
  }
}, import.meta.url);
