import { page } from '@anzaui/anza/ui';

page('/docs/elements/stat', {
  tag: 'doc-elements-stat',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Stat — Anza',
    description: 'ui-stat — KPI statistic with label, value, and trend.'
  }
}, import.meta.url);
