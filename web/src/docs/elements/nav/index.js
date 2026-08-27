import { page } from '@anzaui/anza/ui';

page('/docs/elements/nav', {
  tag: 'doc-elements-nav',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Nav — Anza',
    description: 'ui-nav — accessible navigation wrapper with orientation.'
  }
}, import.meta.url);
