import { page } from '@anzaui/anza/ui';

page('/docs/elements/sidebar', {
  tag: 'doc-elements-sidebar',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Sidebar — Anza',
    description: 'ui-sidebar — collapsible side panel.'
  }
}, import.meta.url);
