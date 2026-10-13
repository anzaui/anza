import { page } from '@anzaui/anza/ui';

page('/docs/elements/breadcrumb', {
  tag: 'doc-elements-breadcrumb',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Breadcrumb — Anza',
    description: 'ui-breadcrumb — breadcrumb trail in a labelled nav, with slash separators and the last item shown as current.'
  }
}, import.meta.url);
