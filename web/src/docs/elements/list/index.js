import { page } from '@anzaui/anza/ui';

page('/docs/elements/list', {
  tag: 'doc-elements-list',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'List — Anza',
    description: 'ui-list — vertical list with divided rows and an optional bordered panel.'
  }
}, import.meta.url);
