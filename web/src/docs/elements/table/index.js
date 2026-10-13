import { page } from '@anzaui/anza/ui';

page('/docs/elements/table', {
  tag: 'doc-elements-table',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Table — Anza',
    description: 'ui-table — bordered, horizontally scrolling wrapper for a native HTML table.'
  }
}, import.meta.url);
