import { page } from '@anzaui/anza/ui';

page('/docs/elements/nav', {
  tag: 'doc-elements-nav',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Nav — Anza',
    description: 'ui-nav — navigation landmark that lays out ui-link children in a row or a column.'
  }
}, import.meta.url);
