import { page } from '@adukiorg/anza/ui';

page('/docs/elements/pagination', {
  tag: 'doc-elements-pagination',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Pagination — Anza',
    description: 'ui-pagination — prev/next pagination with URL or prop control.'
  }
}, import.meta.url);
