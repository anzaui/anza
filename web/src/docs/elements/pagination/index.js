import { page } from '@anzaui/anza/ui';

page('/docs/elements/pagination', {
  tag: 'doc-elements-pagination',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Pagination — Anza',
    description: 'ui-pagination — Previous and Next buttons with a page indicator, driven by the page attribute or the ?page= query.'
  }
}, import.meta.url);
