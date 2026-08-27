import { page } from '@anzaui/anza/ui';

page('/docs/elements/navigation', {
  tag: 'doc-elements-navigation',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Navigation — Anza',
    description: 'Tabs, nav, breadcrumbs, pagination, and multi-step flows.'
  }
}, import.meta.url);
