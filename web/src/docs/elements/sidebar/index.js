import { page } from '@anzaui/anza/ui';

page('/docs/elements/sidebar', {
  tag: 'doc-elements-sidebar',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Sidebar — Anza',
    description: 'ui-sidebar — sticky side panel that collapses to a narrow rail with the collapsed attribute or toggle().'
  }
}, import.meta.url);
