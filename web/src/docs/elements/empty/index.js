import { page } from '@anzaui/anza/ui';

page('/docs/elements/empty', {
  tag: 'doc-elements-empty',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Empty — Anza',
    description: 'ui-empty: empty-state panel with an illustration slot, title, description and an actions slot.'
  }
}, import.meta.url);
