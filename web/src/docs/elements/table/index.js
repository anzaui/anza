import { page } from '@anzaui/anza/ui';

page('/docs/elements/table', {
  tag: 'doc-elements-table',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Table — Anza',
    description: 'ui-table — styled wrapper for native HTML tables.'
  }
}, import.meta.url);
